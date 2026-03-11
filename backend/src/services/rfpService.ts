/**
 * RFP Service — classifies tasks, finds GHL prospect vendors, and sends RFP messages.
 */
import { TicketTask } from '../models/TicketTask';
import { Note } from '../models/Note';
import { loadAIConfig } from './aiConfig';
import { callLLM } from './llmClient';
import { ghlREST, hasGHLConfig, getGHLConfig } from './ghlClient';
import { loadBusinessConfig } from '../lib/businessConfig';
import { MOCK_GHL_CONTACTS } from '../lib/mockGHLData';
import { env } from '../config/env';

// ─── Types ───────────────────────────────────────────────────────────────────

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

function buildMessages(
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
<p>We are reaching out with a Request for Proposal (RFP) for the following jobs:</p>
<ol>${tasks.map((t) => `<li>${t.description}</li>`).join('')}</ol>
<p>Please reply if you are available and interested. Thank you!</p>`];
    }
    const list = tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n');
    return [`Hello ${vendorName}, we have a Request for Proposal for the following jobs:\n${list}\nPlease reply if you are available and interested.`];
  }

  // individual — one message per task
  return tasks.map((t) => {
    if (channel === 'email') {
      return `<p>Hello ${vendorName},</p>
<p>We are reaching out with a Request for Proposal (RFP) for the following job:</p>
<p><strong>${t.description}</strong></p>
<p>Please reply if you are available and interested. Thank you!</p>`;
    }
    return `Hello ${vendorName}, we have a Request for Proposal for: ${t.description}. Please reply if available and interested.`;
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

  const dbTasks = await TicketTask.find({ _id: { $in: taskIds }, ticket_ref: ticketId }).lean();
  if (!dbTasks.length) return { sent: 0, skipped: 0, vendors: [] };

  const taskItems = dbTasks.map((t) => ({ id: String(t._id), description: t.description }));

  const classified = await classifyTasks(taskItems, aiConfig);

  // Group by service_code::location
  const groups = new Map<string, TaskClassification[]>();
  for (const c of classified) {
    const key = `${c.service_code}::${c.location}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Find vendors per group, accumulate tasks per vendor
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
      console.log(`[RFP] No reachable channel for ${vendor.name ?? vendor.id} — skipping`);
      skipped++;
      continue;
    }

    const messages = buildMessages(tasks, vendor, channel, aiConfig.rfp_message_grouping);
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
