import { TicketTask } from '../models/TicketTask';
import { Ticket } from '../models/Ticket';
import { jobberGraphQL, hasTokens } from './jobberClient';
import { runAgentLoop, type ToolDef } from './llmClient';
import { loadAIConfig } from './aiConfig';
import { env } from '../config/env';
import { MOCK_JOBS, MOCK_VISITS, MOCK_QUOTES } from '../lib/mockJobberData';
import { loadBusinessConfig } from '../lib/businessConfig';
import { logger } from '../lib/logger';

// ─── Buffer types ─────────────────────────────────────────────────────────────

type JobRecord = {
  id: string;
  title: string;
  status: string;
  clientName: string;
  street: string;
  city: string;
};

type VisitRecord = {
  id: string;
  title: string;
  date: string;
  clientName: string;
  street: string;
  city: string;
};

type QuoteRecord = {
  id: string;
  title: string;
  status: string;
  clientName: string;
  street: string;
  city: string;
};

type RawQuote = {
  id: string; title?: string | null; quoteStatus?: string; status?: string;
  client?: { id?: string; name?: string };
  property?: { address?: { street?: string; city?: string }; street?: string; city?: string };
};

type BufferEntry =
  | { kind: 'jobs'; action: string; records: JobRecord[] }
  | { kind: 'visits'; action: string; records: VisitRecord[] }
  | { kind: 'quotes'; action: string; records: QuoteRecord[] };

// ─── Data normalizers ─────────────────────────────────────────────────────────

type RawJob = {
  id: string; title: string; jobStatus?: string; status?: string;
  client?: { name?: string };
  property?: { address?: { street?: string; city?: string }; street?: string; city?: string };
};

type RawVisit = {
  id: string; title?: string | null; startAt?: string; scheduledStart?: string;
  client?: { id?: string; name?: string };
  property?: { address?: { street?: string; city?: string }; street?: string; city?: string };
  job?: { title?: string | null };
};

function normalizeJob(j: RawJob): JobRecord {
  const prop = j.property as Record<string, unknown> | undefined;
  const street = j.property?.address?.street ?? (prop?.street as string) ?? '';
  const city = j.property?.address?.city ?? (prop?.city as string) ?? '';
  return {
    id: j.id,
    title: j.title ?? `Job #${j.id}`,
    status: j.jobStatus ?? j.status ?? '',
    clientName: j.client?.name ?? '',
    street,
    // Only append city if not already contained in the street string
    city: city && street.toLowerCase().includes(city.toLowerCase()) ? '' : city,
  };
}

function normalizeVisit(v: RawVisit): VisitRecord {
  const prop = v.property as Record<string, unknown> | undefined;
  const street = v.property?.address?.street ?? (prop?.street as string) ?? '';
  const city = v.property?.address?.city ?? (prop?.city as string) ?? '';
  return {
    id: v.id,
    // Jobber visits may not have their own title — use parent job title as fallback
    title: v.job?.title ?? v.title ?? 'Visit',
    date: (v.startAt ?? v.scheduledStart ?? '').slice(0, 10),
    clientName: v.client?.name ?? '',
    street,
    city: city && street.toLowerCase().includes(city.toLowerCase()) ? '' : city,
  };
}

function normalizeQuote(q: RawQuote): QuoteRecord {
  const prop = q.property as Record<string, unknown> | undefined;
  const street = q.property?.address?.street ?? (prop?.street as string) ?? '';
  const city = q.property?.address?.city ?? (prop?.city as string) ?? '';
  return {
    id: q.id,
    title: q.title ?? `Quote #${q.id}`,
    status: q.quoteStatus ?? q.status ?? '',
    clientName: q.client?.name ?? '',
    street,
    city: city && street.toLowerCase().includes(city.toLowerCase()) ? '' : city,
  };
}

// ─── Task generation from buffer ─────────────────────────────────────────────

const ACTION_VERBS: Record<string, string> = {
  cancel: 'Cancel',
  reschedule: 'Reschedule',
  rebid: 'Rebid',
  review: 'Review',
  follow_up: 'Follow up on',
};

function generateTasksFromBuffer(buffer: BufferEntry[]): string[] {
  const tasks: string[] = [];
  for (const entry of buffer) {
    const verb = ACTION_VERBS[entry.action] ?? 'Action for';
    if (entry.kind === 'jobs') {
      for (const r of entry.records) {
        const loc = [r.street, r.city].filter(Boolean).join(', ');
        tasks.push(`${verb} job "${r.title}"${loc ? ` at ${loc}` : ''}${r.clientName ? ` for ${r.clientName}` : ''}`);
      }
    } else if (entry.kind === 'visits') {
      for (const r of entry.records) {
        const loc = [r.street, r.city].filter(Boolean).join(', ');
        tasks.push(`${verb} visit "${r.title}"${r.date ? ` on ${r.date}` : ''}${loc ? ` at ${loc}` : ''}${r.clientName ? ` for ${r.clientName}` : ''}`);
      }
    } else {
      for (const r of entry.records) {
        const loc = [r.street, r.city].filter(Boolean).join(', ');
        tasks.push(`${verb} quote "${r.title}"${loc ? ` at ${loc}` : ''}${r.clientName ? ` for ${r.clientName}` : ''}`);
      }
    }
  }
  return tasks;
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const biz = loadBusinessConfig();
  const serviceLines = Object.entries(biz.services).map(([code, name]) => `  ${code} = ${name}`).join('\n');
  const locationLines = biz.locations.map((l) => `  - ${l}`).join('\n');

  return `You are a ticket intelligence agent for TIX4SMB, a ticket management system for a cleaning services business.

Your job is to analyze a new ticket, detect the intended actions from the description, and call the appropriate query tools. The app generates task descriptions from the results — you just call the right tools with the right actions.

## Business context

Service types:
${serviceLines}

Service locations:
${locationLines}

## Step 1 — Detect actions from the description

Scan the description for these keywords and map each to an action value:

| Keywords | Action |
|----------|--------|
| cancel, cancellation, terminate, stop, end | cancel |
| reschedule, move, delay, shift, postpone | reschedule |
| rebid, re-bid, new bid, requote, new quote | rebid |
| review, check, assess, look into | review |
| follow up, contact, reach out, notify | follow_up |

If multiple actions are detected (e.g. "cancel and rebid"), call the search tools **once per action**.

## Step 2 — Detect scope from the description

- "jobs" mentioned → call job search tools
- "visits" mentioned → call visit search tools
- "quotes" mentioned → call get_quotes tool
- No scope specified, or "all" / "everything" → call ALL relevant tools (jobs + visits + quotes)

## Step 3 — Call tools using the Linked entity ID

**For a vendor entity:**
- Jobs → search_jobs_by_vendor(vendor_id, action)
- Visits → search_visits_by_vendor(vendor_id, action)
- Quotes → search_quotes_by_vendor(vendor_id, action)

**For a client entity:**
- Jobs → search_jobs_by_client(client_id, action)
- Visits → search_visits_by_client(client_id, action)
- Quotes → search_quotes_by_client(client_id, action)

## Multi-action example

Description: "cancel and rebid all jobs, visits, and quotes"
→ search_jobs_by_vendor(vendor_id, action="cancel")
→ search_visits_by_vendor(vendor_id, action="cancel")
→ search_quotes_by_vendor(vendor_id, action="cancel")
→ search_jobs_by_vendor(vendor_id, action="rebid")
→ search_visits_by_vendor(vendor_id, action="rebid")
→ search_quotes_by_vendor(vendor_id, action="rebid")

## Action values
- "cancel" — work needs to be cancelled or reassigned
- "reschedule" — same vendor/client, different time
- "rebid" — needs a new bid or quote prepared
- "review" — needs review or assessment
- "follow_up" — follow-up needed

## Finishing up
After calling all query tools, call submit_tasks() with any supplementary tasks not covered by the queries (e.g. "Notify affected clients"). Leave the array empty if none needed.`;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const ACTION_PARAM = {
  action: {
    type: 'string',
    enum: ['cancel', 'reschedule', 'rebid', 'review', 'follow_up'],
    description: 'What needs to be done with the found records.',
  },
};

const TOOLS: ToolDef[] = [
  {
    name: 'search_jobs_by_vendor',
    description: 'Find all jobs assigned to a specific vendor by their ID.',
    parameters: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string', description: 'The vendor entity ID.' },
        ...ACTION_PARAM,
      },
      required: ['vendor_id', 'action'],
    },
  },
  {
    name: 'search_visits_by_vendor',
    description: 'Find all visits assigned to a specific vendor by their ID.',
    parameters: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string', description: 'The vendor entity ID.' },
        ...ACTION_PARAM,
      },
      required: ['vendor_id', 'action'],
    },
  },
  {
    name: 'search_quotes_by_vendor',
    description: 'Find all quotes associated with a specific vendor by their ID.',
    parameters: {
      type: 'object',
      properties: {
        vendor_id: { type: 'string', description: 'The vendor entity ID.' },
        ...ACTION_PARAM,
      },
      required: ['vendor_id', 'action'],
    },
  },
  {
    name: 'search_jobs_by_client',
    description: 'Find all jobs for a specific client by their ID.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'The client entity ID.' },
        ...ACTION_PARAM,
      },
      required: ['client_id', 'action'],
    },
  },
  {
    name: 'search_visits_by_client',
    description: 'Find all visits for a specific client by their ID.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'The client entity ID.' },
        ...ACTION_PARAM,
      },
      required: ['client_id', 'action'],
    },
  },
  {
    name: 'search_quotes_by_client',
    description: 'Find all quotes for a specific client by their ID.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'The client entity ID.' },
        ...ACTION_PARAM,
      },
      required: ['client_id', 'action'],
    },
  },
  {
    name: 'get_upcoming_visits',
    description: 'Get upcoming visits in the next N days (no specific client — use search_visits_by_client for a known client).',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days ahead to look (default: 30).' },
        ...ACTION_PARAM,
      },
      required: ['action'],
    },
  },
  {
    name: 'get_quotes',
    description: 'Get all quotes (no specific entity — use search_quotes_by_vendor or search_quotes_by_client when an ID is available).',
    parameters: {
      type: 'object',
      properties: {
        ...ACTION_PARAM,
      },
      required: ['action'],
    },
  },
  {
    name: 'submit_tasks',
    description: 'Signal completion and optionally submit supplementary tasks not covered by the query tools.',
    parameters: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: { description: { type: 'string' } },
            required: ['description'],
          },
          description: 'Supplementary tasks only (e.g. "Notify affected clients"). Leave empty if none.',
        },
      },
      required: ['tasks'],
    },
  },
];

// ─── Mock helper ──────────────────────────────────────────────────────────────

let _mockOverride: boolean | null = null;
const useMock = () => _mockOverride !== null ? _mockOverride : !hasTokens();

// ─── Jobber data fetchers ─────────────────────────────────────────────────────

export type VendorVisitNode = RawVisit & {
  visitStatus?: string;
  assignedUsers?: { nodes?: Array<{ id: string }> };
  job: RawJob & { id: string };
};

export async function fetchVendorVisits(vendorId: string): Promise<VendorVisitNode[]> {
  const data = await jobberGraphQL<{ visits: { nodes: VendorVisitNode[] } }>(`
    query GetVendorVisitsAndJobs {
      visits(first: 50) {
        nodes {
          id title startAt visitStatus
          assignedUsers { nodes { id } }
          client { id name }
          property { address { street city } }
          job { id title jobStatus client { id name } property { address { street city } } }
        }
      }
    }
  `);
  return data.visits.nodes.filter(
    (v) => v.assignedUsers?.nodes?.some((u) => u.id === vendorId)
  );
}

async function fetchJobsByVendorId(vendorId: string): Promise<JobRecord[]> {
  if (useMock()) {
    return MOCK_JOBS
      .filter((j) => j.vendor?.id === vendorId)
      .map(normalizeJob);
  }
  try {
    const assigned = await fetchVendorVisits(vendorId);
    const jobMap = new Map<string, JobRecord>();
    for (const v of assigned) {
      if (v.job && !jobMap.has(v.job.id)) jobMap.set(v.job.id, normalizeJob(v.job));
    }
    const jobs = Array.from(jobMap.values());
    logger.info(`[Agent:debug] fetchJobsByVendorId(${vendorId}): ${assigned.length} assigned visits → ${jobs.length} unique jobs`);
    return jobs;
  } catch (err) {
    logger.error(`[Agent:debug] fetchJobsByVendorId failed — Jobber query error:`, err);
    return [];
  }
}

async function fetchVisitsByVendorId(vendorId: string): Promise<VisitRecord[]> {
  if (useMock()) {
    return MOCK_VISITS
      .filter((v) => v.vendor?.id === vendorId)
      .map(normalizeVisit);
  }
  try {
    const assigned = await fetchVendorVisits(vendorId);
    logger.info(`[Agent:debug] fetchVisitsByVendorId(${vendorId}): ${assigned.length} assigned visits`);
    return assigned.map(normalizeVisit);
  } catch (err) {
    logger.error(`[Agent:debug] fetchVisitsByVendorId failed — Jobber query error:`, err);
    return [];
  }
}

async function fetchClientJobsById(clientId: string): Promise<JobRecord[]> {
  if (useMock()) {
    return MOCK_JOBS
      .filter((j) => j.client.id === clientId)
      .map(normalizeJob);
  }
  const data = await jobberGraphQL<{ jobs: { nodes: RawJob[] } }>(`
    query GetClientJobs($clientId: EncodedId) {
      jobs(filter: { clientId: $clientId }) { nodes { id title jobStatus client { id name } property { address { street city } } } }
    }`, { clientId });
  return data.jobs.nodes.map(normalizeJob);
}

async function fetchQuotesById(vendorId?: string, clientId?: string): Promise<QuoteRecord[]> {
  if (useMock()) {
    return MOCK_QUOTES
      .filter((q) => {
        if (vendorId) return q.vendor?.id === vendorId;
        if (clientId) return q.client?.id === clientId;
        return true;
      })
      .map(normalizeQuote);
  }
  // Jobber GraphQL: requests/quotes API
  const data = await jobberGraphQL<{ quotes: { nodes: RawQuote[] } }>(`
    query GetQuotes { quotes { nodes { id title quoteStatus client { id name } property { address { street city } } } } }`);
  return data.quotes.nodes
    .filter((q) => {
      if (vendorId) return false; // Jobber quotes are client-scoped; vendor filter not applicable
      if (clientId) return q.client?.id === clientId;
      return true;
    })
    .map(normalizeQuote);
}

async function fetchUpcomingVisits(days: number, clientId?: string): Promise<VisitRecord[]> {
  if (useMock()) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const today = new Date().toISOString().slice(0, 10);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return MOCK_VISITS
      .filter((v) => {
        const inRange = v.scheduledStart >= today && v.scheduledStart <= cutoffStr;
        const matchClient = clientId ? v.client.id === clientId : true;
        return inRange && matchClient;
      })
      .map(normalizeVisit);
  }
  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 86400000).toISOString();
  const data = await jobberGraphQL<{ visits: { nodes: RawVisit[] } }>(`
    query GetVisits($from: ISO8601DateTime, $to: ISO8601DateTime) {
      visits(filter: { startAt: { gte: $from, lte: $to } }) {
        nodes { id startAt visitStatus client { id name } property { address { street city } } job { title } }
      }
    }`, { from, to });
  const raw = clientId
    ? data.visits.nodes.filter((v) => v.client?.id === clientId)
    : data.visits.nodes;
  return raw.map(normalizeVisit);
}

// ─── Public entry ─────────────────────────────────────────────────────────────

export async function runTicketAgent(ticketId: string, mockOverride?: boolean): Promise<void> {
  _mockOverride = mockOverride ?? null;
  try {
    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) return;

    const config = loadAIConfig();
    const apiKey = (() => {
      if (config.provider === 'anthropic') return env.ANTHROPIC_API_KEY;
      if (config.provider === 'openai')    return env.OPENAI_API_KEY;
      if (config.provider === 'google')    return env.GOOGLE_API_KEY;
    })();

    if (!apiKey) {
      logger.warn(`[Agent] No API key for provider "${config.provider}" — skipping agent.`);
      return;
    }

    // Buffer collects Jobber results server-side; LLM never sees the raw data
    const buffer: BufferEntry[] = [];

    const executeTool = async (name: string, input: Record<string, unknown>): Promise<unknown> => {
      const action = (input.action as string) ?? 'review';
      logger.info(`[Agent:tool] → ${name}`, JSON.stringify(input));
      try {
        let result: unknown;
        switch (name) {
          case 'search_jobs_by_vendor': {
            const records = await fetchJobsByVendorId(input.vendor_id as string);
            buffer.push({ kind: 'jobs', action, records });
            result = { message: `Found ${records.length} job(s) for vendor.` };
            break;
          }
          case 'search_visits_by_vendor': {
            const records = await fetchVisitsByVendorId(input.vendor_id as string);
            buffer.push({ kind: 'visits', action, records });
            result = { message: `Found ${records.length} visit(s) for vendor.` };
            break;
          }
          case 'search_jobs_by_client': {
            const records = await fetchClientJobsById(input.client_id as string);
            buffer.push({ kind: 'jobs', action, records });
            result = { message: `Found ${records.length} job(s) for client.` };
            break;
          }
          case 'search_visits_by_client': {
            const records = await fetchUpcomingVisits(30, input.client_id as string);
            buffer.push({ kind: 'visits', action, records });
            result = { message: `Found ${records.length} visit(s) for client.` };
            break;
          }
          case 'search_quotes_by_client': {
            const records = await fetchQuotesById(undefined, input.client_id as string);
            buffer.push({ kind: 'quotes', action, records });
            result = { message: `Found ${records.length} quote(s) for client.` };
            break;
          }
          case 'get_upcoming_visits': {
            const records = await fetchUpcomingVisits((input.days as number | undefined) ?? 30);
            buffer.push({ kind: 'visits', action, records });
            result = { message: `Found ${records.length} upcoming visit(s).` };
            break;
          }
          case 'search_quotes_by_vendor': {
            const records = await fetchQuotesById(input.vendor_id as string, undefined);
            buffer.push({ kind: 'quotes', action, records });
            result = { message: `Found ${records.length} quote(s) for vendor.` };
            break;
          }
          case 'get_quotes': {
            const records = await fetchQuotesById(
              input.vendor_id as string | undefined,
              input.client_id as string | undefined,
            );
            buffer.push({ kind: 'quotes', action, records });
            result = { message: `Found ${records.length} quote(s).` };
            break;
          }
          default:
            result = { message: 'Unknown tool — skipped.' };
        }
        logger.info(`[Agent:tool] ← ${name}: ${(result as { message: string }).message}`);
        return result;
      } catch (err) {
        logger.error(`[Agent:tool] ✗ ${name} failed:`, err);
        return { message: 'Query failed — continuing with available data.' };
      }
    };

    const entityHint = (() => {
      if (!ticket.jobber_entity_type || !ticket.jobber_entity_id) return '';
      const id = ticket.jobber_entity_id;
      if (ticket.jobber_entity_type === 'vendor') {
        return `Linked entity: vendor (ID: ${id})\n→ Required tools: search_jobs_by_vendor(vendor_id="${id}"), search_visits_by_vendor(vendor_id="${id}"), and search_quotes_by_vendor(vendor_id="${id}")`;
      }
      if (ticket.jobber_entity_type === 'client') {
        return `Linked entity: client (ID: ${id})\n→ Required tools: search_jobs_by_client(client_id="${id}"), search_visits_by_client(client_id="${id}"), and search_quotes_by_client(client_id="${id}")`;
      }
      return `Linked entity: ${ticket.jobber_entity_type} (ID: ${id})`;
    })();

    const userMessage = [
      `New ticket created:`,
      `Title: ${ticket.title}`,
      ticket.description ? `Description: ${ticket.description}` : '',
      ticket.tags?.length ? `Tags: ${ticket.tags.join(', ')}` : '',
      entityHint,
    ].filter(Boolean).join('\n');

    const ERROR_STARTS = ['error', 'sorry', 'i apologize', 'i was unable', 'unable to', 'i encountered', 'i could not', 'could not', 'no action'];
    const ERROR_CONTAINS = ['is not supported', 'permission denied', 'api error', 'not available'];
    let totalTasksCreated = 0;

    logger.info(`[Agent:debug] Starting agent for ticket ${ticketId} (provider: ${config.provider}, model: ${config.model})`);
    logger.info(`[Agent:debug] User message:\n${userMessage}`);

    try {
      await runAgentLoop({
        provider: config.provider,
        model: config.model,
        apiKey,
        system: buildSystemPrompt(),
        userMessage,
        tools: TOOLS,
        executeTool,
        onTasks: async (llmTasks) => {
          // Log buffer summary before generating tasks
          logger.info(`[Agent:debug] Buffer (${buffer.length} entr${buffer.length === 1 ? 'y' : 'ies'}):`);
          buffer.forEach((e, i) => logger.info(`[Agent:debug]   [${i}] kind=${e.kind} action=${e.action} count=${e.records.length}`));

          // Generate tasks from buffered Jobber data using templates
          const bufferTaskDescs = generateTasksFromBuffer(buffer);

          logger.info(`[Agent:debug] LLM supplementary tasks (${llmTasks.length}):`, llmTasks.map((t) => t.description));
          logger.info(`[Agent:debug] Buffer-generated task descs (${bufferTaskDescs.length}):`, bufferTaskDescs);

          // Accept supplementary tasks from the LLM (e.g. "Notify affected clients")
          const supplementary = llmTasks
            .map((t) => t.description.trim())
            .filter((desc) => {
              if (desc.length < 10) return false;
              const lower = desc.toLowerCase();
              if (ERROR_STARTS.some((prefix) => lower.startsWith(prefix))) return false;
              if (ERROR_CONTAINS.some((phrase) => lower.includes(phrase))) return false;
              return true;
            });

          const allDescs = [...bufferTaskDescs, ...supplementary];
          if (allDescs.length === 0) return;

          // Deduplicate against existing tasks
          const existing = await TicketTask.find({ ticket_ref: ticketId }).select('description').lean();
          const existingDescs = new Set(existing.map((t) => t.description.trim().toLowerCase()));
          const newDescs = allDescs.filter((d) => !existingDescs.has(d.trim().toLowerCase()));

          if (newDescs.length === 0) {
            logger.info(`[Agent] All ${allDescs.length} task(s) already exist — skipping`);
            return;
          }

          await TicketTask.insertMany(
            newDescs.map((description) => ({
              ticket_ref: ticketId,
              description,
              agent_generated: true,
            }))
          );
          totalTasksCreated += newDescs.length;
          const skipped = allDescs.length - newDescs.length;
          logger.info(`[Agent] Created ${newDescs.length} task(s) for ticket ${ticketId}${skipped ? `, skipped ${skipped} duplicate(s)` : ''}`);
        },
      });
    } catch (err) {
      logger.error('[Agent] LLM error:', err);
      return;
    }

    logger.info(`[Agent] Done. Total tasks created: ${totalTasksCreated} for ticket ${ticketId}`);
  } catch (err) {
    logger.error('[Agent] Error:', err);
  }
}
