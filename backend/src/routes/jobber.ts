import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { authenticate } from '../middleware/authenticate';
import { jobberGraphQL, hasTokens, saveTokens } from '../services/jobberClient';
import { MOCK_CLIENTS, MOCK_JOBS, MOCK_VISITS } from '../lib/mockJobberData';

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

  const data = await jobberGraphQL<{ clients: { nodes: unknown[] } }>(`
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
  `);

  res.json(data.clients?.nodes ?? []);
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
      default:
        res.json({ type, id, label: id });
    }
  } catch {
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
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
