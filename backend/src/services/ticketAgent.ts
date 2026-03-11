import { TicketTask } from '../models/TicketTask';
import { Ticket } from '../models/Ticket';
import { jobberGraphQL, hasTokens } from './jobberClient';
import { runAgentLoop, type ToolDef } from './llmClient';
import { loadAIConfig } from './aiConfig';
import { env } from '../config/env';
import { MOCK_CLIENTS, MOCK_JOBS, MOCK_VISITS } from '../lib/mockJobberData';
import { loadBusinessConfig } from '../lib/businessConfig';

// ─── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const biz = loadBusinessConfig();

  const serviceLines = Object.entries(biz.services)
    .map(([code, name]) => `  ${code} = ${name}`)
    .join('\n');

  const locationLines = biz.locations.map((l) => `  - ${l}`).join('\n');

  return `You are a ticket intelligence agent for TIX4SMB, a ticket management system for a cleaning services business that uses Jobber for field operations.

When a new support ticket is created, your job is to:
1. Analyze the ticket title and description to understand the situation
2. Use the available tools to find relevant Jobber data (clients, jobs, visits)
3. Submit clear, actionable tasks for each item that needs attention

## Business context

Service types (vendors carry tags matching these codes):
${serviceLines}

Service locations:
${locationLines}

Vendors in Jobber have tags that indicate which services they provide (using the codes above) and which locations they cover. Use the service codes and locations to classify each job and identify what type of replacement vendor is needed.

## Common scenarios

- A vendor/employee/worker calls in sick or is unavailable → call search_jobs_by_vendor(vendor_name) AND search_visits_by_vendor(vendor_name). Then GROUP: match visits to jobs by same client + property address. Create ONE task per job — if the job has upcoming visits, include the next visit date in the task. Only create a standalone visit task when it has no matching active job.
- A client cancels → call search_clients() to find the client, then get_client_jobs() and get_upcoming_visits(client_id) to flag their scheduled work.
- A rescheduling request → the vendor can still do the job, just not at that time. Call get_upcoming_visits() or search by vendor/client; group visits with their parent job; create ONE task per job noting the visit date that needs rescheduling — do NOT include vendor replacement language.
- An emergency at a location → call get_upcoming_visits() to find visits at that address and create tasks for each.
- Equipment issue → call get_all_jobs() to find jobs that might be affected.

IMPORTANT: A visit is a scheduled occurrence of a job — never create separate tasks for the same job and one of its visits. Always merge them into one task.

IMPORTANT: For any scenario involving a vendor, worker, or employee, always use search_jobs_by_vendor() and search_visits_by_vendor() — these return ALL records for that vendor with no date limit.

## Task format

For a cancellation (vendor replacement needed):
"Job: [Title] at [Address], [City] for client [Name] — Need [service name] vendor in [location] to cover"
"Job: [Title] at [Address], [City] for client [Name] — visit on [date] — Need [service name] vendor in [location] to cover"

For a rescheduling (same vendor, new time needed — no vendor replacement):
"Job: [Title] at [Address], [City] for client [Name] — visit on [date] needs rescheduling"

For a standalone visit with no matching active job (cancellation/replacement):
"Visit: [Title] at [Address], [City] for client [Name] — scheduled [date] — Need [service name] vendor in [location] to cover"

Always call submit_tasks() when done. If no action items are found, submit an empty tasks array. Never submit tasks that are error messages, apologies, or explanations — only submit actionable job/visit information.`;
}

// ─── Tool definitions ───────────────────────────────────────────────────────

const TOOLS: ToolDef[] = [
  {
    name: 'search_clients',
    description: 'Search Jobber clients by name. Returns a list of matching clients with their IDs.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client name or partial name to search for' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_client_jobs',
    description: 'Get all active jobs for a specific Jobber client by their ID.',
    parameters: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'The Jobber client ID' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'get_all_jobs',
    description: 'Get all Jobber jobs, optionally filtered by status.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by job status: active or completed. Omit for all.' },
      },
      required: [],
    },
  },
  {
    name: 'get_upcoming_visits',
    description: 'Get scheduled visits coming up in the next N days, optionally filtered by client ID.',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days ahead to look (default: 30)' },
        client_id: { type: 'string', description: 'Optional: filter visits by client ID' },
      },
      required: [],
    },
  },
  {
    name: 'search_jobs_by_vendor',
    description: 'Find ALL jobs assigned to a specific vendor (no date limit, no status filter). Use this when a vendor is unavailable or sick.',
    parameters: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor name or partial name to search for (case-insensitive).' },
      },
      required: ['vendor_name'],
    },
  },
  {
    name: 'search_visits_by_vendor',
    description: 'Find ALL visits assigned to a specific vendor (no date limit). Use this when a vendor is unavailable or sick.',
    parameters: {
      type: 'object',
      properties: {
        vendor_name: { type: 'string', description: 'Vendor name or partial name to search for (case-insensitive).' },
      },
      required: ['vendor_name'],
    },
  },
  {
    name: 'submit_tasks',
    description: 'Submit the final actionable tasks to be added to the ticket. Call this when done with research.',
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
          description: 'Array of tasks to add to the ticket.',
        },
      },
      required: ['tasks'],
    },
  },
];

// ─── Jobber data fetchers ───────────────────────────────────────────────────

let _mockOverride: boolean | null = null;
const useMock = () => _mockOverride !== null ? _mockOverride : !hasTokens();

async function searchClients(name: string) {
  if (useMock()) {
    const q = name.toLowerCase();
    return MOCK_CLIENTS.filter((c) => c.name.toLowerCase().includes(q));
  }
  const data = await jobberGraphQL<{
    clients: { nodes: Array<{ id: string; name: string }> };
  }>(`query SearchClients($search: String) {
      clients(filter: { searchTerm: $search }) {
        nodes { id name }
      }
    }`, { search: name });
  return data.clients.nodes;
}

async function getClientJobs(clientId: string) {
  if (useMock()) {
    return MOCK_JOBS.filter((j) => j.client.id === clientId);
  }
  const data = await jobberGraphQL<{
    jobs: { nodes: Array<{ id: string; title: string; jobStatus: string; property?: { address?: { street: string; city: string } } }> };
  }>(`query GetClientJobs($clientId: EncodedId) {
      jobs(filter: { clientId: $clientId }) {
        nodes { id title jobStatus property { address { street city } } }
      }
    }`, { clientId });
  return data.jobs.nodes;
}

async function getAllJobs(status?: string) {
  if (useMock()) {
    return status ? MOCK_JOBS.filter((j) => j.status === status) : MOCK_JOBS;
  }
  const data = await jobberGraphQL<{
    jobs: { nodes: Array<{ id: string; title: string; jobStatus: string; client?: { id: string; name: string }; property?: { address?: { street: string; city: string } } }> };
  }>(`query GetAllJobs {
      jobs { nodes { id title jobStatus client { id name } property { address { street city } } } }
    }`);
  return status
    ? data.jobs.nodes.filter((j) => j.jobStatus.toLowerCase() === status.toLowerCase())
    : data.jobs.nodes;
}

async function getUpcomingVisits(days = 30, clientId?: string) {
  if (useMock()) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    const today = new Date().toISOString().slice(0, 10);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return MOCK_VISITS.filter((v) => {
      const inRange = v.scheduledStart >= today && v.scheduledStart <= cutoffStr;
      const matchClient = clientId ? v.client.id === clientId : true;
      return inRange && matchClient;
    });
  }
  const from = new Date().toISOString();
  const to = new Date(Date.now() + days * 86400000).toISOString();
  const data = await jobberGraphQL<{
    visits: { nodes: Array<{ id: string; title: string; startAt: string; visitStatus: string; client?: { id: string; name: string }; property?: { address?: { street: string; city: string } } }> };
  }>(`query GetVisits($from: ISO8601DateTime, $to: ISO8601DateTime) {
      visits(filter: { startAt: { gte: $from, lte: $to } }) {
        nodes { id title startAt visitStatus client { id name } property { address { street city } } }
      }
    }`, { from, to });
  const nodes = data.visits.nodes;
  return clientId ? nodes.filter((v) => v.client?.id === clientId) : nodes;
}

async function searchJobsByVendor(vendorName: string) {
  if (useMock()) {
    const q = vendorName.toLowerCase();
    return MOCK_JOBS.filter((j) => j.vendor?.name?.toLowerCase().includes(q));
  }
  // Real Jobber: fetch all jobs and filter client-side (Jobber API has no vendor filter)
  const data = await jobberGraphQL<{
    jobs: { nodes: Array<{ id: string; title: string; jobStatus: string; client?: { id: string; name: string }; property?: { address?: { street: string; city: string } } }> };
  }>(`query GetAllJobs {
      jobs { nodes { id title jobStatus client { id name } property { address { street city } } } }
    }`);
  return data.jobs.nodes;
}

async function searchVisitsByVendor(vendorName: string) {
  if (useMock()) {
    const q = vendorName.toLowerCase();
    return MOCK_VISITS.filter((v) => v.vendor?.name?.toLowerCase().includes(q));
  }
  // Real Jobber: fetch all visits and filter client-side
  const data = await jobberGraphQL<{
    visits: { nodes: Array<{ id: string; title: string; startAt: string; visitStatus: string; client?: { id: string; name: string }; property?: { address?: { street: string; city: string } } }> };
  }>(`query GetAllVisits {
      visits { nodes { id title startAt visitStatus client { id name } property { address { street city } } } }
    }`);
  return data.visits.nodes;
}

// ─── Tool executor ──────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_clients':
        return await searchClients(input.name as string);
      case 'get_client_jobs':
        return await getClientJobs(input.client_id as string);
      case 'get_all_jobs':
        return await getAllJobs(input.status as string | undefined);
      case 'get_upcoming_visits':
        return await getUpcomingVisits(
          (input.days as number | undefined) ?? 30,
          input.client_id as string | undefined,
        );
      case 'search_jobs_by_vendor':
        return await searchJobsByVendor(input.vendor_name as string);
      case 'search_visits_by_vendor':
        return await searchVisitsByVendor(input.vendor_name as string);
      default:
        return { result: 'Unknown tool — skipped.' };
    }
  } catch (err) {
    // Return a neutral message so the LLM does not echo raw errors into notes
    console.error(`[Agent tool error] ${name}:`, err);
    return { result: 'Data temporarily unavailable. Continue with available data.' };
  }
}

// ─── Public entry ───────────────────────────────────────────────────────────

export async function runTicketAgent(ticketId: string, mockOverride?: boolean): Promise<void> {
  _mockOverride = mockOverride ?? null;
  try {
    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) return;

    const config = loadAIConfig();

    // Resolve API key for the selected provider
    const apiKey = (() => {
      if (config.provider === 'anthropic') return env.ANTHROPIC_API_KEY;
      if (config.provider === 'openai')    return env.OPENAI_API_KEY;
      if (config.provider === 'google')    return env.GOOGLE_API_KEY;
    })();

    if (!apiKey) {
      console.warn(`[Agent] No API key for provider "${config.provider}" — skipping agent.`);
      return;
    }

    const userMessage = [
      `New ticket created:`,
      `Title: ${ticket.title}`,
      ticket.description ? `Description: ${ticket.description}` : '',
      ticket.tags?.length ? `Tags: ${ticket.tags.join(', ')}` : '',
      ticket.jobber_entity_type
        ? `Linked Jobber entity: ${ticket.jobber_entity_type}${ticket.jobber_entity_label ? ` "${ticket.jobber_entity_label}"` : ''} (ID: ${ticket.jobber_entity_id ?? 'unknown'})`
        : '',
    ].filter(Boolean).join('\n');

    const ERROR_STARTS = ['error', 'sorry', 'i apologize', 'i was unable', 'unable to', 'i encountered', 'i could not', 'could not', 'no action'];
    const ERROR_CONTAINS = ['is not supported', 'permission denied', 'api error', 'not available'];
    let totalTasksCreated = 0;

    try {
      await runAgentLoop({
        provider: config.provider,
        model: config.model,
        apiKey,
        system: buildSystemPrompt(),
        userMessage,
        tools: TOOLS,
        executeTool,
        onTasks: async (tasks) => {
          const validTasks = tasks.filter((t) => {
            const desc = t.description.trim();
            if (desc.length < 20) return false;
            const lower = desc.toLowerCase();
            if (ERROR_STARTS.some((prefix) => lower.startsWith(prefix))) return false;
            if (ERROR_CONTAINS.some((phrase) => lower.includes(phrase))) return false;
            return true;
          });
          if (validTasks.length === 0) return;

          // Deduplicate against existing tasks for this ticket
          const existing = await TicketTask.find({ ticket_ref: ticketId }).select('description').lean();
          const existingDescs = new Set(existing.map((t) => t.description.trim().toLowerCase()));
          const newTasks = validTasks.filter((t) => !existingDescs.has(t.description.trim().toLowerCase()));

          if (newTasks.length === 0) {
            console.log(`[Agent] All ${validTasks.length} task(s) already exist — skipping`);
            return;
          }

          await TicketTask.insertMany(
            newTasks.map((t) => ({
              ticket_ref: ticketId,
              description: t.description,
              agent_generated: true,
            }))
          );
          totalTasksCreated += newTasks.length;
          const skipped = validTasks.length - newTasks.length;
          console.log(`[Agent] Created ${newTasks.length} task(s) for ticket ${ticketId}${skipped ? `, skipped ${skipped} duplicate(s)` : ''}`);
        },
      });
    } catch (err) {
      console.error('[Agent] LLM error:', err);
      return;
    }

    console.log(`[Agent] Done. Total tasks created: ${totalTasksCreated} for ticket ${ticketId}`);
  } catch (err) {
    console.error('[Agent] Error:', err);
  }
}

