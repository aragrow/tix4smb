/**
 * RFP Service — classifies tasks, finds GHL prospect vendors, and sends RFP messages.
 */
import { TicketTask } from '../models/TicketTask';
import { Ticket } from '../models/Ticket';
import { Note } from '../models/Note';
import { loadAIConfig } from './aiConfig';
import { callLLM } from './llmClient';
import { ghlREST, hasGHLConfig, getGHLConfig } from './ghlClient';
import { hasTokens as hasJobberTokens, jobberGraphQL } from './jobberClient';
import { loadBusinessConfig } from '../lib/businessConfig';
import { MOCK_GHL_CONTACTS } from '../lib/mockGHLData';
import { MOCK_JOBS, MOCK_VISITS } from '../lib/mockJobberData';
import { env } from '../config/env';

// ─── Types ───────────────────────────────────────────────────────────────────

interface JobberContextItem {
  title: string;
  address: string;
  client: string;
  date?: string;
}

interface JobberContext {
  workType: 'jobs' | 'visits';
  items: JobberContextItem[];
}

interface GHLContact {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  classification?: string;
  communicationPreference?: string;
  dndSettings?: {
    Call?:  { status: string };
    Email?: { status: string };
    SMS?:   { status: string };
  };
  customField?: Array<{ id: string; value: unknown }>;
}

interface TaskClassification {
  taskId: string;
  service_code: string;
  location: string;
  description: string;
}

export interface RFPResult {
  sent: number;
  skipped: number;
  vendors: Array<{ name: string; channel: string }>;
}

export interface RFRSCHResult {
  sent: number;
  skipped: number;
  vendors: Array<{ name: string; channel: string }>;
}

// ─── Detect job/visit intent from ticket + task descriptions ─────────────────

function detectWorkType(texts: string[]): 'jobs' | 'visits' | 'none' {
  const combined = texts.join(' ').toLowerCase();
  if (/\bvisits?\b/.test(combined)) return 'visits';
  if (/\bjobs?\b/.test(combined)) return 'jobs';
  return 'none';
}

// ─── Fetch Jobber context (open jobs or pending visits) by location ───────────

async function fetchJobberContext(workType: 'jobs' | 'visits', location: string): Promise<JobberContext | null> {
  const cityKeyword = location.toLowerCase().split(/\s+/)[0];

  if (!hasJobberTokens()) {
    if (workType === 'jobs') {
      const matches = MOCK_JOBS
        .filter((j) => j.status === 'active' && j.property.city.toLowerCase().includes(cityKeyword))
        .slice(0, 5)
        .map((j) => ({ title: j.title, address: `${j.property.street}, ${j.property.city}`, client: j.client.name }));
      return matches.length ? { workType, items: matches } : null;
    } else {
      const matches = MOCK_VISITS
        .filter((v) => v.status === 'scheduled' && v.property.city.toLowerCase().includes(cityKeyword))
        .slice(0, 5)
        .map((v) => ({ title: v.title, address: `${v.property.street}, ${v.property.city}`, client: v.client.name, date: v.scheduledStart }));
      return matches.length ? { workType, items: matches } : null;
    }
  }

  try {
    if (workType === 'jobs') {
      const data = await jobberGraphQL<{ jobs: { nodes: Array<{ title: string; jobStatus: string; client?: { name: string }; property?: { address?: { street: string; city: string } } }> } }>(`
        query GetOpenJobsForRFP { jobs(first: 50) { nodes { title jobStatus client { name } property { address { street city } } } } }
      `);
      const matches = (data.jobs?.nodes ?? [])
        .filter((j) => j.jobStatus !== 'completed' && j.jobStatus !== 'archived' && (j.property?.address?.city ?? '').toLowerCase().includes(cityKeyword))
        .slice(0, 5)
        .map((j) => ({ title: j.title, address: j.property?.address ? `${j.property.address.street}, ${j.property.address.city}` : '', client: j.client?.name ?? '' }));
      return matches.length ? { workType, items: matches } : null;
    } else {
      const data = await jobberGraphQL<{ visits: { nodes: Array<{ title: string; startAt?: string; visitStatus: string; client?: { name: string }; property?: { address?: { street: string; city: string } } }> } }>(`
        query GetPendingVisitsForRFP { visits(first: 50) { nodes { title startAt visitStatus client { name } property { address { street city } } } } }
      `);
      const matches = (data.visits?.nodes ?? [])
        .filter((v) => v.visitStatus !== 'completed' && (v.property?.address?.city ?? '').toLowerCase().includes(cityKeyword))
        .slice(0, 5)
        .map((v) => ({ title: v.title, address: v.property?.address ? `${v.property.address.street}, ${v.property.address.city}` : '', client: v.client?.name ?? '', date: v.startAt }));
      return matches.length ? { workType, items: matches } : null;
    }
  } catch (err) {
    console.warn('[RFP] Failed to fetch Jobber context:', err);
    return null;
  }
}

// ─── Classify tasks via LLM ───────────────────────────────────────────────────

async function classifyTasks(
  tasks: Array<{ id: string; description: string }>,
  aiConfig: ReturnType<typeof loadAIConfig>
): Promise<TaskClassification[]> {
  const bizConfig = loadBusinessConfig();
  const servicesList = Object.entries(bizConfig.services)
    .map(([code, label]) => `${code}: ${label}`)
    .join('\n');
  const locationsList = bizConfig.locations.join(', ');

  const apiKey =
    aiConfig.provider === 'anthropic' ? env.ANTHROPIC_API_KEY :
    aiConfig.provider === 'openai'    ? env.OPENAI_API_KEY :
    env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn('[RFP] No API key configured — using first service/location as fallback');
    return tasks.map((t) => ({
      taskId: t.id,
      service_code: Object.keys(bizConfig.services)[0] ?? 'rc',
      location: bizConfig.locations[0] ?? '',
      description: t.description,
    }));
  }

  const system = 'You are a classification assistant. Given task descriptions for a cleaning business, determine the service code and location for each task. Return ONLY a valid JSON array with no commentary or markdown.';

  const userMessage = `Service codes:\n${servicesList}\n\nKnown locations: ${locationsList}\n\nTasks to classify:\n${
    tasks.map((t, i) => `[${i}] id="${t.id}" description="${t.description}"`).join('\n')
  }\n\nReturn a JSON array like:\n[{"taskId": "...", "service_code": "rc", "location": "key west fl"}, ...]\nMatch each task to the best service code and location from the known lists.`;

  try {
    const raw = await callLLM({ provider: aiConfig.provider, model: aiConfig.model, apiKey, system, userMessage });
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in LLM response');
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ taskId: string; service_code: string; location: string }>;
    console.log(`[RFP] Classified ${parsed.length} task(s)`);
    return parsed.map((p) => ({
      ...p,
      description: tasks.find((t) => t.id === p.taskId)?.description ?? '',
    }));
  } catch (err) {
    console.warn('[RFP] LLM classification failed:', err, '— using fallback');
    return tasks.map((t) => ({
      taskId: t.id,
      service_code: Object.keys(bizConfig.services)[0] ?? 'rc',
      location: bizConfig.locations[0] ?? '',
      description: t.description,
    }));
  }
}

// ─── Find GHL prospect vendors ────────────────────────────────────────────────

async function findVendors(serviceCode: string, location: string): Promise<GHLContact[]> {
  const classification = env.GHL_CONTACT_CLASSIFICATION;

  if (!hasGHLConfig()) {
    const results = (MOCK_GHL_CONTACTS as GHLContact[]).filter((c) => {
      const tags = c.tags ?? [];
      return (
        c.classification === classification &&
        tags.includes(serviceCode) &&
        tags.includes(location)
      );
    });
    console.log(`[RFP] Mock: ${results.length} vendor(s) for ${serviceCode}/${location}`);
    return results;
  }

  const cfg = getGHLConfig()!;

  // Find checkbox custom field ID for classification label
  let checkboxFieldId: string | null = null;
  if (classification) {
    try {
      type GHLField = { id: string; name: string; fieldKey?: string };
      const fieldsData = await ghlREST<{ customFields?: GHLField[] }>(
        `/locations/${cfg.location_id}/customFields`
      );
      const needle = classification.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = (fieldsData.customFields ?? []).find((f) => {
        const fname = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fkey  = (f.fieldKey ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return fname === needle || fkey.includes(needle) || fname.includes(needle);
      });
      if (match) checkboxFieldId = match.id;
      else console.warn(`[RFP] Custom field "${classification}" not found in GHL location`);
    } catch {
      console.warn('[RFP] Could not fetch GHL custom fields — skipping classification filter');
    }
  }

  const data = await ghlREST<{ contacts?: GHLContact[] }>(
    `/contacts/?locationId=${cfg.location_id}&limit=100`
  );
  const contacts = data.contacts ?? [];

  const filtered = contacts.filter((c) => {
    const tags = c.tags ?? [];
    let classMatch = true;
    if (checkboxFieldId) {
      const entry = (c.customField ?? []).find((f) => f.id === checkboxFieldId);
      classMatch = entry !== undefined &&
        (entry.value === true || entry.value === 'true' || entry.value === '1' || entry.value === 1);
    }
    return classMatch && tags.includes(serviceCode) && tags.includes(location);
  });

  console.log(`[RFP] Found ${filtered.length} vendor(s) for ${serviceCode}/${location}`);
  return filtered;
}

// ─── Resolve communication channel ───────────────────────────────────────────

function resolveChannel(vendor: GHLContact): 'sms' | 'email' | null {
  const dnd = vendor.dndSettings ?? {};
  const canSms = Boolean(vendor.phone) &&
    dnd.SMS?.status !== 'active' &&
    dnd.Call?.status !== 'active';
  const canEmail = Boolean(vendor.email) &&
    dnd.Email?.status !== 'active';
  if (canSms) return 'sms';
  if (canEmail) return 'email';
  return null;
}

// ─── Build message text(s) ────────────────────────────────────────────────────

function renderJobberContextText(ctx: JobberContext): string {
  const label = ctx.workType === 'jobs' ? 'Open jobs in your area' : 'Pending visits in your area';
  const lines = ctx.items.map((item) => {
    const date = item.date ? `${item.date} — ` : '';
    return `• ${date}${item.title} at ${item.address} (${item.client})`;
  }).join('\n');
  return `\n\n${label}:\n${lines}`;
}

function renderJobberContextHtml(ctx: JobberContext): string {
  const label = ctx.workType === 'jobs' ? 'Open jobs in your area' : 'Pending visits in your area';
  const items = ctx.items.map((item) => {
    const date = item.date ? `<strong>${item.date}</strong> — ` : '';
    return `<li>${date}${item.title} at ${item.address} (${item.client})</li>`;
  }).join('');
  return `<p><strong>${label}:</strong></p><ul>${items}</ul>`;
}

function buildMessages(
  tasks: TaskClassification[],
  vendor: GHLContact,
  channel: 'sms' | 'email',
  grouping: 'individual' | 'combined',
  jobberContext: JobberContext | null
): string[] {
  const vendorName = vendor.name ??
    [vendor.firstName, vendor.lastName].filter(Boolean).join(' ') ??
    'Team';

  if (grouping === 'combined') {
    if (channel === 'email') {
      const ctx = jobberContext ? renderJobberContextHtml(jobberContext) : '';
      return [`<p>Hello ${vendorName},</p>
<p>We are reaching out with a Request for Proposal (RFP) for the following jobs:</p>
<ol>${tasks.map((t) => `<li>${t.description}</li>`).join('')}</ol>${ctx}
<p>Please reply if you are available and interested. Thank you!</p>`];
    }
    const list = tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n');
    const ctx = jobberContext ? renderJobberContextText(jobberContext) : '';
    return [`Hello ${vendorName}, we have a Request for Proposal for the following jobs:\n${list}${ctx}\nPlease reply if you are available and interested.`];
  }

  // individual — one message per task
  return tasks.map((t) => {
    if (channel === 'email') {
      const ctx = jobberContext ? renderJobberContextHtml(jobberContext) : '';
      return `<p>Hello ${vendorName},</p>
<p>We are reaching out with a Request for Proposal (RFP) for the following job:</p>
<p><strong>${t.description}</strong></p>${ctx}
<p>Please reply if you are available and interested. Thank you!</p>`;
    }
    const ctx = jobberContext ? renderJobberContextText(jobberContext) : '';
    return `Hello ${vendorName}, we have a Request for Proposal for: ${t.description}.${ctx}\nPlease reply if available and interested.`;
  });
}

// ─── Send a single GHL message ────────────────────────────────────────────────

async function sendGHLMessage(
  vendor: GHLContact,
  channel: 'sms' | 'email',
  message: string
): Promise<void> {
  if (!hasGHLConfig()) {
    console.log(`[RFP] Mock send ${channel.toUpperCase()} to ${vendor.name ?? vendor.id}`);
    return;
  }

  const cfg = getGHLConfig()!;

  if (channel === 'sms') {
    await ghlREST('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: 'SMS',
        contactId: vendor.id,
        message,
        locationId: cfg.location_id,
      }),
    });
  } else {
    if (!vendor.email) throw new Error(`Vendor ${vendor.id} has no email`);
    await ghlREST('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify({
        type: 'Email',
        contactId: vendor.id,
        emailTo: vendor.email,
        subject: 'Request for Proposal',
        html: message,
        locationId: cfg.location_id,
      }),
    });
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function runRFP(ticketId: string, taskIds: string[]): Promise<RFPResult> {
  const aiConfig = loadAIConfig();

  const [dbTasks, ticket] = await Promise.all([
    TicketTask.find({ _id: { $in: taskIds }, ticket_ref: ticketId }).lean(),
    Ticket.findById(ticketId).lean(),
  ]);
  if (!dbTasks.length) return { sent: 0, skipped: 0, vendors: [] };

  const taskItems = dbTasks.map((t) => ({ id: String(t._id), description: t.description }));

  // Detect whether the ticket/tasks reference jobs or visits
  const workType = detectWorkType([ticket?.description ?? '', ...taskItems.map((t) => t.description)]);
  console.log(`[RFP] Work type detected: ${workType}`);

  const classified = await classifyTasks(taskItems, aiConfig);

  // Group by service_code::location
  const groups = new Map<string, TaskClassification[]>();
  for (const c of classified) {
    const key = `${c.service_code}::${c.location}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Pre-fetch Jobber context per unique location
  const jobberContextByLocation = new Map<string, JobberContext | null>();
  if (workType !== 'none') {
    const locations = [...new Set(classified.map((c) => c.location))];
    await Promise.all(
      locations.map(async (loc) => {
        const ctx = await fetchJobberContext(workType, loc);
        jobberContextByLocation.set(loc, ctx);
        if (ctx) console.log(`[RFP] Jobber context: ${ctx.items.length} ${workType} for "${loc}"`);
      })
    );
  }

  // Find vendors per group, accumulate tasks per vendor (also track location)
  const vendorMap = new Map<string, { vendor: GHLContact; tasks: TaskClassification[]; location: string }>();
  for (const [key, groupTasks] of groups) {
    const [serviceCode, location] = key.split('::');
    const vendors = await findVendors(serviceCode, location);
    for (const v of vendors) {
      if (!vendorMap.has(v.id)) vendorMap.set(v.id, { vendor: v, tasks: [], location });
      for (const t of groupTasks) {
        if (!vendorMap.get(v.id)!.tasks.find((x) => x.taskId === t.taskId)) {
          vendorMap.get(v.id)!.tasks.push(t);
        }
      }
    }
  }

  let sent = 0;
  let skipped = 0;
  const vendorsSummary: Array<{ name: string; channel: string }> = [];

  for (const { vendor, tasks, location } of vendorMap.values()) {
    const channel = resolveChannel(vendor);
    if (!channel) {
      console.log(`[RFP] No reachable channel for ${vendor.name ?? vendor.id} — skipping`);
      skipped++;
      continue;
    }

    const jobberContext = jobberContextByLocation.get(location) ?? null;
    const messages = buildMessages(tasks, vendor, channel, aiConfig.rfp_message_grouping, jobberContext);
    const vendorName = vendor.name ?? [vendor.firstName, vendor.lastName].filter(Boolean).join(' ') ?? vendor.id;
    try {
      for (const msg of messages) {
        await sendGHLMessage(vendor, channel, msg);
      }
      console.log(`[RFP] Sent ${messages.length} ${channel.toUpperCase()} message(s) to ${vendorName}`);
      sent += messages.length;
      vendorsSummary.push({ name: vendorName, channel });
    } catch (err) {
      console.error(`[RFP] Failed to send to ${vendorName}:`, err);
      skipped++;
    }
  }

  // Mark tasks as sent
  await TicketTask.updateMany(
    { _id: { $in: taskIds }, ticket_ref: ticketId },
    { status: 'sent', updated_at: new Date() }
  );

  // Create note
  const noteBody = vendorsSummary.length > 0
    ? `RFP sent to ${vendorsSummary.length} vendor(s):\n${vendorsSummary.map((v) => `• ${v.name} via ${v.channel.toUpperCase()}`).join('\n')}`
    : `RFP processed — no reachable vendors found for ${taskIds.length} task(s).`;

  await Note.create({
    ticket_ref: ticketId,
    body: noteBody,
    agent_generated: true,
    created_at: new Date(),
  });

  return { sent, skipped, vendors: vendorsSummary };
}

// ─── RFRSCH message builder ───────────────────────────────────────────────────

function buildRFRSCHMessages(
  tasks: TaskClassification[],
  vendor: GHLContact,
  channel: 'sms' | 'email',
  grouping: 'individual' | 'combined'
): string[] {
  const vendorName = vendor.name ??
    [vendor.firstName, vendor.lastName].filter(Boolean).join(' ') ??
    'Team';

  if (grouping === 'combined') {
    if (channel === 'email') {
      return [`<p>Hello ${vendorName},</p>
<p>We need to reschedule the following visit(s). Please reply with your availability for a new time:</p>
<ol>${tasks.map((t) => `<li>${t.description}</li>`).join('')}</ol>
<p>Thank you!</p>`];
    }
    const list = tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n');
    return [`Hello ${vendorName}, we need to reschedule the following visit(s):\n${list}\nPlease reply with your availability for a new time.`];
  }

  // individual — one message per task
  return tasks.map((t) => {
    if (channel === 'email') {
      return `<p>Hello ${vendorName},</p>
<p>We need to reschedule the following visit. Please reply with your availability for a new time:</p>
<p><strong>${t.description}</strong></p>
<p>Thank you!</p>`;
    }
    return `Hello ${vendorName}, we need to reschedule: ${t.description}. Please reply with your availability for a new time.`;
  });
}

// ─── RFRSCH orchestrator ─────────────────────────────────────────────────────

export async function runRFRSCH(ticketId: string, taskIds: string[]): Promise<RFRSCHResult> {
  const aiConfig = loadAIConfig();

  const dbTasks = await TicketTask.find({ _id: { $in: taskIds }, ticket_ref: ticketId }).lean();
  if (!dbTasks.length) return { sent: 0, skipped: 0, vendors: [] };

  const taskItems = dbTasks.map((t) => ({ id: String(t._id), description: t.description }));
  const classified = await classifyTasks(taskItems, aiConfig);

  const groups = new Map<string, TaskClassification[]>();
  for (const c of classified) {
    const key = `${c.service_code}::${c.location}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const vendorMap = new Map<string, { vendor: GHLContact; tasks: TaskClassification[] }>();
  for (const [key, groupTasks] of groups) {
    const [serviceCode, location] = key.split('::');
    const vendors = await findVendors(serviceCode, location);
    for (const v of vendors) {
      if (!vendorMap.has(v.id)) vendorMap.set(v.id, { vendor: v, tasks: [] });
      for (const t of groupTasks) {
        if (!vendorMap.get(v.id)!.tasks.find((x) => x.taskId === t.taskId)) {
          vendorMap.get(v.id)!.tasks.push(t);
        }
      }
    }
  }

  let sent = 0;
  let skipped = 0;
  const vendorsSummary: Array<{ name: string; channel: string }> = [];

  for (const { vendor, tasks } of vendorMap.values()) {
    const channel = resolveChannel(vendor);
    if (!channel) {
      console.log(`[RFRSCH] No reachable channel for ${vendor.name ?? vendor.id} — skipping`);
      skipped++;
      continue;
    }

    const messages = buildRFRSCHMessages(tasks, vendor, channel, aiConfig.rfp_message_grouping);
    const vendorName = vendor.name ?? [vendor.firstName, vendor.lastName].filter(Boolean).join(' ') ?? vendor.id;
    try {
      for (const msg of messages) {
        await sendGHLMessage(vendor, channel, msg);
      }
      console.log(`[RFRSCH] Sent ${messages.length} ${channel.toUpperCase()} message(s) to ${vendorName}`);
      sent += messages.length;
      vendorsSummary.push({ name: vendorName, channel });
    } catch (err) {
      console.error(`[RFRSCH] Failed to send to ${vendorName}:`, err);
      skipped++;
    }
  }

  await TicketTask.updateMany(
    { _id: { $in: taskIds }, ticket_ref: ticketId },
    { status: 'sent', updated_at: new Date() }
  );

  const noteBody = vendorsSummary.length > 0
    ? `Reschedule request sent to ${vendorsSummary.length} vendor(s):\n${vendorsSummary.map((v) => `• ${v.name} via ${v.channel.toUpperCase()}`).join('\n')}`
    : `Reschedule request processed — no reachable vendors found for ${taskIds.length} task(s).`;

  await Note.create({
    ticket_ref: ticketId,
    body: noteBody,
    agent_generated: true,
    created_at: new Date(),
  });

  return { sent, skipped, vendors: vendorsSummary };
}
