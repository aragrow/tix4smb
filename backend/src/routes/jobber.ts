import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { authenticate } from '../middleware/authenticate';
import { jobberGraphQL, hasTokens, saveTokens } from '../services/jobberClient';
import { MOCK_CLIENTS, MOCK_LEADS, MOCK_VENDORS, MOCK_JOBS, MOCK_VISITS } from '../lib/mockJobberData';

const router = Router();

const JOBBER_AUTH_URL = 'https://api.getjobber.com/api/oauth/authorize';
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';

// ─── Jobber OAuth (requires user to be logged in via Google first) ──

router.get('/auth/jobber', authenticate, (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: env.JOBBER_CLIENT_ID,
    redirect_uri: `${env.API_URL}/auth/jobber/callback`,
    response_type: 'code',
  });
  res.redirect(`${JOBBER_AUTH_URL}?${params}`);
});

router.get('/auth/jobber/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query as Record<string, string>;

  if (error || !code) {
    res.redirect(`${env.FRONTEND_URL}/settings?error=jobber_auth_failed`);
    return;
  }

  const tokenRes = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.JOBBER_CLIENT_ID,
      client_secret: env.JOBBER_CLIENT_SECRET,
      redirect_uri: `${env.API_URL}/auth/jobber/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) {
    res.redirect(`${env.FRONTEND_URL}/settings?error=jobber_token_failed`);
    return;
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  });

  res.redirect(`${env.FRONTEND_URL}/settings?jobber=connected`);
});

// ─── Protected API routes ──────────────────────────────────────────

router.use(authenticate);

router.get('/api/jobber/status', (req: Request, res: Response) => {
  res.json({ connected: hasTokens() });
});

router.get('/api/jobber/clients', async (req: Request, res: Response) => {
  if (!hasTokens()) {
    res.status(400).json({ error: 'Jobber not connected' });
    return;
  }

  const [clientsData, leadsData] = await Promise.all([
    jobberGraphQL<{ clients: { nodes: { id: string; name: string; billingAddress?: unknown }[] } }>(`
      query GetClients {
        clients(first: 50) {
          nodes {
            id
            name
            billingAddress {
              street
              city
              province
              postalCode
            }
          }
        }
      }
    `),
    jobberGraphQL<{ leads: { nodes: { id: string; leadStatus?: string }[] } }>(`
      query GetLeadStatuses { leads(first: 50) { nodes { id leadStatus } } }
    `).catch(() => null),
  ]);

  const leadStatusMap = new Map<string, string>();
  for (const l of leadsData?.leads?.nodes ?? []) {
    if (l.leadStatus) leadStatusMap.set(l.id, l.leadStatus);
  }

  const nodes = (clientsData.clients?.nodes ?? []).map((c) => {
    const ls = leadStatusMap.get(c.id);
    return ls ? { ...c, leadStatus: ls } : c;
  });

  res.json(nodes);
});

router.get('/api/jobber/leads', async (req: Request, res: Response) => {
  if (!hasTokens()) {
    res.json(MOCK_LEADS);
    return;
  }

  try {
    // Try dedicated leads query first
    const leadsData = await jobberGraphQL<{ leads: { nodes: unknown[] } }>(`
      query GetLeads {
        leads(first: 50) {
          nodes { id name leadStatus }
        }
      }
    `).catch(() => null);

    const fromLeads = leadsData?.leads?.nodes ?? [];

    if (fromLeads.length > 0) {
      console.log(`[Jobber] /api/jobber/leads → ${fromLeads.length} lead(s) from leads query`);
      res.json(fromLeads);
      return;
    }

    // Fallback: in some Jobber accounts leads are stored as clients
    console.log('[Jobber] leads query returned 0 — falling back to clients query');
    const clientsData = await jobberGraphQL<{ clients: { nodes: unknown[] } }>(`
      query GetLeadClients {
        clients(first: 50) {
          nodes { id name }
        }
      }
    `);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fromClients = (clientsData?.clients?.nodes ?? []).map((c: any) => ({ ...c, leadStatus: 'Lead' }));
    console.log(`[Jobber] /api/jobber/leads → ${fromClients.length} lead(s) from clients fallback`);
    res.json(fromClients);
  } catch (err) {
    console.error('[Jobber] leads query failed:', err);
    res.status(500).json({ error: 'Failed to fetch leads', detail: String(err) });
  }
});

router.get('/api/jobber/visits', async (req: Request, res: Response) => {
  if (!hasTokens()) {
    res.status(400).json({ error: 'Jobber not connected' });
    return;
  }

  const data = await jobberGraphQL<{ visits: { nodes: unknown[] } }>(`
    query GetVisits {
      visits(first: 50) {
        nodes {
          id
          title
          startAt
          visitStatus
          client { id name }
          property { id address { street city } }
        }
      }
    }
  `);

  // Normalize startAt → scheduledStart to match frontend type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = (data.visits?.nodes ?? []).map((v: any) => ({
    ...v,
    scheduledStart: v.startAt ?? v.scheduledStart,
  }));

  res.json(nodes);
});

router.get('/api/jobber/jobs', async (req: Request, res: Response) => {
  if (!hasTokens()) {
    res.status(400).json({ error: 'Jobber not connected' });
    return;
  }

  const data = await jobberGraphQL<{ jobs: { nodes: unknown[] } }>(`
    query GetJobs {
      jobs(first: 50) {
        nodes {
          id
          title
          jobStatus
          client {
            id
            name
          }
          property {
            id
            address {
              street
              city
            }
          }
        }
      }
    }
  `);

  res.json(data.jobs?.nodes ?? []);
});

// Resolve a single entity by type + id → returns display label + structured info
router.get('/api/jobber/entity', async (req: Request, res: Response) => {
  const { type, id } = req.query as { type?: string; id?: string };
  if (!type || !id) {
    res.status(400).json({ error: 'type and id are required' });
    return;
  }

  if (!hasTokens()) {
    // Use mock data
    switch (type) {
      case 'client': {
        const c = MOCK_CLIENTS.find((x) => x.id === id);
        if (!c) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: c.name, name: c.name });
        return;
      }
      case 'job': {
        const j = MOCK_JOBS.find((x) => x.id === id);
        if (!j) { res.status(404).json({ error: 'Not found' }); return; }
        const addr = j.property ? `${j.property.street}, ${j.property.city}` : '';
        res.json({ type, id, label: j.title + (addr ? ` at ${addr}` : '') + (j.client ? ` — ${j.client.name}` : ''), title: j.title, address: addr, client: j.client });
        return;
      }
      case 'visit': {
        const v = MOCK_VISITS.find((x) => x.id === id);
        if (!v) { res.status(404).json({ error: 'Not found' }); return; }
        const addr = v.property ? `${v.property.street}, ${v.property.city}` : '';
        res.json({ type, id, label: `${v.scheduledStart} · ${v.title}` + (addr ? ` at ${addr}` : '') + (v.client ? ` — ${v.client.name}` : ''), title: v.title, scheduledStart: v.scheduledStart, address: addr, client: v.client });
        return;
      }
      case 'lead': {
        const l = MOCK_LEADS.find((x) => x.id === id);
        if (!l) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: l.name, name: l.name, leadStatus: l.leadStatus });
        return;
      }
      default:
        res.json({ type, id, label: id });
        return;
    }
  }

  // Real Jobber lookup
  try {
    switch (type) {
      case 'client': {
        const data = await jobberGraphQL<{ client: { id: string; name: string } | null }>(
          `query GetClient($id: EncodedId!) { client(id: $id) { id name } }`, { id }
        );
        const c = data.client;
        if (!c) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: c.name, name: c.name });
        return;
      }
      case 'job': {
        const data = await jobberGraphQL<{ job: { id: string; title: string; client?: { name: string }; property?: { address?: { street: string; city: string } } } | null }>(
          `query GetJob($id: EncodedId!) { job(id: $id) { id title client { name } property { address { street city } } } }`, { id }
        );
        const j = data.job;
        if (!j) { res.status(404).json({ error: 'Not found' }); return; }
        const addr = j.property?.address ? `${j.property.address.street}, ${j.property.address.city}` : '';
        res.json({ type, id, label: j.title + (addr ? ` at ${addr}` : '') + (j.client ? ` — ${j.client.name}` : ''), title: j.title, address: addr, client: j.client });
        return;
      }
      case 'visit': {
        const data = await jobberGraphQL<{ visit: { id: string; title: string; startAt?: string; client?: { name: string }; property?: { address?: { street: string; city: string } } } | null }>(
          `query GetVisit($id: EncodedId!) { visit(id: $id) { id title startAt client { name } property { address { street city } } } }`, { id }
        );
        const v = data.visit;
        if (!v) { res.status(404).json({ error: 'Not found' }); return; }
        const addr = v.property?.address ? `${v.property.address.street}, ${v.property.address.city}` : '';
        const start = v.startAt ?? '';
        res.json({ type, id, label: (start ? `${start} · ` : '') + v.title + (addr ? ` at ${addr}` : '') + (v.client ? ` — ${v.client.name}` : ''), title: v.title, scheduledStart: start, address: addr, client: v.client });
        return;
      }
      case 'vendor': {
        const data = await jobberGraphQL<{ user: { id: string; name: { full: string }; email?: { raw: string } } | null }>(
          `query GetUser($id: EncodedId!) { user(id: $id) { id name { full } email { raw } } }`, { id }
        );
        const u = data.user;
        if (!u) { res.status(404).json({ error: 'Not found' }); return; }
        const name = u.name?.full ?? id;
        res.json({ type, id, label: name, name, email: u.email?.raw });
        return;
      }
      case 'lead': {
        const data = await jobberGraphQL<{ lead: { id: string; name: string; leadStatus?: string } | null }>(
          `query GetLead($id: EncodedId!) { lead(id: $id) { id name leadStatus } }`, { id }
        );
        const l = data.lead;
        if (!l) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: l.name, name: l.name, leadStatus: l.leadStatus });
        return;
      }
      default:
        res.json({ type, id, label: id });
    }
  } catch {
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

router.get('/api/jobber/vendors', async (req: Request, res: Response) => {
  if (!hasTokens()) {
    res.json(MOCK_VENDORS);
    return;
  }

  const data = await jobberGraphQL<{ users: { nodes: { id: string; name: { full: string }; email: { raw: string } }[] } }>(`
    query GetUsers {
      users(first: 50) {
        nodes {
          id
          name { full }
          email { raw }
        }
      }
    }
  `);

  // Map Jobber users to the vendor shape the frontend expects
  const vendors = (data.users?.nodes ?? []).map((u) => ({
    id: u.id,
    name: u.name?.full ?? u.id,
    email: u.email?.raw,
  }));

  res.json(vendors);
});

router.get('/api/jobber/test-query', async (req: Request, res: Response) => {
  const useMock = !hasTokens();

  if (useMock) {
    const job = MOCK_JOBS[0] ?? null;
    res.json({
      mock: true,
      entities: [
        { type: 'Client',      data: MOCK_CLIENTS[0]  ?? null },
        { type: 'Property',    data: job?.property    ?? null },
        { type: 'Job',         data: job              ?? null },
        { type: 'Visit',       data: MOCK_VISITS[0]   ?? null },
        { type: 'Vendor/Team', data: MOCK_VENDORS[0]  ?? null },
      ],
    });
    return;
  }

  const fallback = <T>(key: string) => (err: unknown) => {
    console.error(`[Jobber] test-query ${key} failed:`, err);
    return null as T;
  };

  const [clientsData, jobsData, visitsData, usersData] = await Promise.all([
    jobberGraphQL<{ clients: { nodes: unknown[] } }>(`query { clients(first: 1) { nodes { id name billingAddress { street city } } } }`).catch(fallback<{ clients: { nodes: unknown[] } }>('clients')),
    jobberGraphQL<{ jobs: { nodes: unknown[] } }>(`query { jobs(first: 1) { nodes { id title jobStatus client { id name } property { id address { street city } } } } }`).catch(fallback<{ jobs: { nodes: unknown[] } }>('jobs')),
    jobberGraphQL<{ visits: { nodes: unknown[] } }>(`query { visits(first: 1) { nodes { id title startAt visitStatus client { id name } property { id address { street city } } } } }`).catch(fallback<{ visits: { nodes: unknown[] } }>('visits')),
    jobberGraphQL<{ users: { nodes: { id: string; name: { full: string }; email?: { raw: string } }[] } }>(`query { users(first: 1) { nodes { id name { full } email { raw } } } }`).catch(fallback<{ users: { nodes: { id: string; name: { full: string }; email?: { raw: string } }[] } }>('users')),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = (jobsData?.jobs?.nodes?.[0] as any) ?? null;
  const userRaw = usersData?.users?.nodes?.[0] ?? null;
  const userData = userRaw ? { id: userRaw.id, name: userRaw.name?.full, email: userRaw.email?.raw } : null;

  res.json({
    mock: false,
    entities: [
      { type: 'Client',      data: clientsData?.clients?.nodes?.[0] ?? null },
      { type: 'Property',    data: job?.property ?? null },
      { type: 'Job',         data: job },
      { type: 'Visit',       data: visitsData?.visits?.nodes?.[0] ?? null },
      { type: 'Vendor/Team', data: userData },
    ],
  });
});

router.post('/api/jobber/sync', async (req: Request, res: Response) => {
  if (!hasTokens()) {
    res.status(400).json({ error: 'Jobber not connected' });
    return;
  }
  // Placeholder: full sync logic can be expanded here
  res.json({ ok: true, message: 'Sync triggered successfully' });
});

export default router;
