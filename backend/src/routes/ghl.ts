import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { ghlREST, hasGHLConfig, getGHLConfig } from '../services/ghlClient';
import {
  MOCK_GHL_CONTACTS,
  MOCK_GHL_OPPORTUNITIES,
  MOCK_GHL_APPOINTMENTS,
} from '../lib/mockGHLData';

const router = Router();
router.use(authenticate);

const useMock = () => !hasGHLConfig();

// ─── Status ─────────────────────────────────────────────────────────

router.get('/api/ghl/status', (req: Request, res: Response) => {
  const cfg = getGHLConfig();
  res.json({ connected: hasGHLConfig(), location_id: cfg?.location_id });
});

// ─── Contacts ───────────────────────────────────────────────────────

router.get('/api/ghl/contacts', async (req: Request, res: Response) => {
  if (useMock()) {
    res.json(MOCK_GHL_CONTACTS);
    return;
  }
  const cfg = getGHLConfig()!;
  const data = await ghlREST<{ contacts: unknown[] }>(
    `/contacts/?locationId=${cfg.location_id}&limit=100`
  );
  res.json(data.contacts ?? []);
});

// ─── Opportunities ──────────────────────────────────────────────────

router.get('/api/ghl/opportunities', async (req: Request, res: Response) => {
  if (useMock()) {
    res.json(MOCK_GHL_OPPORTUNITIES);
    return;
  }
  const cfg = getGHLConfig()!;
  const data = await ghlREST<{ opportunities: unknown[] }>(
    `/opportunities/search?location_id=${cfg.location_id}&limit=100`
  );
  res.json(data.opportunities ?? []);
});

// ─── Appointments ───────────────────────────────────────────────────

router.get('/api/ghl/appointments', async (req: Request, res: Response) => {
  if (useMock()) {
    res.json(MOCK_GHL_APPOINTMENTS);
    return;
  }
  const cfg = getGHLConfig()!;
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 30 * 86400000).toISOString();
  const data = await ghlREST<{ events: unknown[] }>(
    `/calendars/events?locationId=${cfg.location_id}&startTime=${from}&endTime=${to}`
  );
  res.json(data.events ?? []);
});

// ─── Entity resolver ────────────────────────────────────────────────

router.get('/api/ghl/entity', async (req: Request, res: Response) => {
  const { type, id } = req.query as { type?: string; id?: string };
  if (!type || !id) {
    res.status(400).json({ error: 'type and id are required' });
    return;
  }

  if (useMock()) {
    switch (type) {
      case 'contact': {
        const c = MOCK_GHL_CONTACTS.find((x) => x.id === id);
        if (!c) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: c.name, name: c.name, email: c.email, phone: c.phone });
        return;
      }
      case 'opportunity': {
        const o = MOCK_GHL_OPPORTUNITIES.find((x) => x.id === id);
        if (!o) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: o.name, name: o.name, contact: o.contact, pipelineStage: o.pipelineStage, monetaryValue: o.monetaryValue });
        return;
      }
      case 'appointment': {
        const a = MOCK_GHL_APPOINTMENTS.find((x) => x.id === id);
        if (!a) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: `${a.startTime} · ${a.title}`, title: a.title, startTime: a.startTime, address: a.address, contact: a.contact });
        return;
      }
      default:
        res.json({ type, id, label: id });
        return;
    }
  }

  // Real GHL lookup
  try {
    switch (type) {
      case 'contact': {
        const data = await ghlREST<{ contact: { id: string; firstName: string; lastName: string; email?: string; phone?: string } | null }>(
          `/contacts/${id}`
        );
        const c = data.contact;
        if (!c) { res.status(404).json({ error: 'Not found' }); return; }
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
        res.json({ type, id, label: name, name, email: c.email, phone: c.phone });
        return;
      }
      case 'opportunity': {
        const data = await ghlREST<{ opportunity: { id: string; name: string; status: string; monetaryValue?: number; contact?: { id: string; name: string } } | null }>(
          `/opportunities/${id}`
        );
        const o = data.opportunity;
        if (!o) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: o.name, name: o.name, pipelineStage: o.status, monetaryValue: o.monetaryValue, contact: o.contact });
        return;
      }
      case 'appointment': {
        const data = await ghlREST<{ event: { id: string; title: string; startTime: string; address?: string; contact?: { id: string; name: string } } | null }>(
          `/calendars/events/${id}`
        );
        const a = data.event;
        if (!a) { res.status(404).json({ error: 'Not found' }); return; }
        res.json({ type, id, label: `${a.startTime} · ${a.title}`, title: a.title, startTime: a.startTime, address: a.address, contact: a.contact });
        return;
      }
      default:
        res.json({ type, id, label: id });
    }
  } catch {
    res.status(500).json({ error: 'Failed to fetch GHL entity' });
  }
});

export default router;
