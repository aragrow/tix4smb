import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { ghlREST, hasGHLConfig, getGHLConfig } from '../services/ghlClient';
import { Note } from '../models/Note';
import { env } from '../config/env';
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

// ─── Send Email ──────────────────────────────────────────────────────────────

const SendEmailSchema = z.object({
  ticketId:  z.string().min(1),
  contactId: z.string().min(1),
  emailTo:   z.string().email(),
  subject:   z.string().min(1).max(200),
  body:      z.string().min(1).max(10000),
  contactLabel: z.string().optional(),
});

router.post('/api/ghl/email', async (req: Request, res: Response) => {
  const result = SendEmailSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const { ticketId, contactId, emailTo, subject, body, contactLabel } = result.data;

  if (useMock()) {
    // In mock mode, just log a note and return success
    await Note.create({
      ticket_ref: ticketId,
      body: `📧 [Mock] Email sent to ${contactLabel ?? emailTo} via GoHighLevel.\n\n**Subject:** ${subject}`,
      agent_generated: true,
      created_at: new Date(),
    });
    res.json({ ok: true, mock: true });
    return;
  }

  const cfg = getGHLConfig()!;
  const data = await ghlREST<{ conversationId?: string; messageId?: string }>(
    '/conversations/messages',
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'Email',
        contactId,
        emailTo,
        subject,
        html: body,
        locationId: cfg.location_id,
      }),
    }
  );

  // Create a note on the ticket recording the send
  await Note.create({
    ticket_ref: ticketId,
    body: `📧 Email sent to ${contactLabel ?? emailTo} via GoHighLevel.\n\n**Subject:** ${subject}`,
    agent_generated: true,
    created_at: new Date(),
  });

  res.json({ ok: true, data });
});

// ─── Test Contact Query ───────────────────────────────────────────────────────
// Queries contacts filtered by GHL_CONTACT_CLASSIFICATION + service tag + location tag.

router.get('/api/ghl/contacts/test-query', async (req: Request, res: Response) => {
  const classification = env.GHL_CONTACT_CLASSIFICATION;
  const serviceTag    = (req.query.service  as string | undefined) ?? 'rc';
  const locationTag   = (req.query.location as string | undefined) ?? 'key west fl';

  type GHLContact = {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    classification?: string;
    type?: string;
    contactType?: string;
    communicationPreference?: string;
    dnd?: boolean;
    dndSettings?: {
      Call?:      { status: string };
      Email?:     { status: string };
      SMS?:       { status: string };
      WhatsApp?:  { status: string };
      GMB?:       { status: string };
      FB?:        { status: string };
    };
  };

  if (useMock()) {
    const results = (MOCK_GHL_CONTACTS as GHLContact[]).filter((c) => {
      const tags = c.tags ?? [];
      return (
        c.classification === classification &&
        tags.includes(serviceTag) &&
        tags.includes(locationTag)
      );
    });
    res.json({ contacts: results.slice(0, 5), classification, serviceTag, locationTag, mock: true, total: results.length });
    return;
  }

  try {
    const cfg = getGHLConfig()!;

    // Step 1: Find the checkbox field ID by name (PROSPECT_VENDOR is a custom checkbox in GHL)
    type GHLField = { id: string; name: string; fieldKey?: string };
    let checkboxFieldId: string | null = null;
    if (classification) {
      try {
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
        else console.warn(`[GHL test-query] Custom field "${classification}" not found in location fields`);
      } catch {
        console.warn('[GHL test-query] Could not fetch custom fields — skipping classification filter');
      }
    }

    // Step 2: Fetch contacts (all, filter client-side)
    const data = await ghlREST<{ contacts?: GHLContact[] }>(
      `/contacts/?locationId=${cfg.location_id}&limit=100`
    );
    const contacts = data.contacts ?? [];

    // Step 3: Filter by checkbox value + tags
    type ContactWithCustom = GHLContact & { customField?: Array<{ id: string; value: unknown }> };
    const filtered = (contacts as ContactWithCustom[]).filter((c) => {
      const tags = c.tags ?? [];
      let classMatch = true;
      if (checkboxFieldId) {
        const entry = (c.customField ?? []).find((f) => f.id === checkboxFieldId);
        classMatch = entry !== undefined &&
          (entry.value === true || entry.value === 'true' || entry.value === '1' || entry.value === 1);
      }
      return classMatch && tags.includes(serviceTag) && tags.includes(locationTag);
    });

    res.json({ contacts: filtered.slice(0, 5), classification, serviceTag, locationTag, mock: false, total: filtered.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GHL test-query]', message);
    res.status(500).json({ error: message });
  }
});

// ─── Notify Test Vendor ───────────────────────────────────────────────────────
// Sends an SMS or email to the configured test contact (GHL_TEST_CONTACT_ID).

const NotifyTestSchema = z.object({
  type:    z.enum(['SMS', 'Email']),
  message: z.string().min(1).max(2000),
  subject: z.string().min(1).max(200).optional(),
});

router.post('/api/ghl/test-notify', async (req: Request, res: Response) => {
  const result = NotifyTestSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const { type, message, subject } = result.data;
  const contactId = env.GHL_TEST_CONTACT_ID;
  if (!contactId) {
    res.status(400).json({ error: 'GHL_TEST_CONTACT_ID is not configured in .env.local' });
    return;
  }

  if (useMock()) {
    res.json({ ok: true, mock: true, type, contactId });
    return;
  }

  try {
    const cfg = getGHLConfig()!;

    if (type === 'SMS') {
      const data = await ghlREST('/conversations/messages', {
        method: 'POST',
        body: JSON.stringify({
          type: 'SMS',
          contactId,
          message,
          locationId: cfg.location_id,
        }),
      });
      res.json({ ok: true, type, data });
    } else {
      // Email — look up the contact's email address first
      // GHL V2 returns { contact: {...} } but some endpoints return the object directly
      type RawContact = { email?: string; firstName?: string; lastName?: string };
      const contactData = await ghlREST<{ contact?: RawContact } & RawContact>(
        `/contacts/${contactId}`
      );
      // Support both wrapped { contact: {email} } and flat { email } responses
      const emailTo = contactData.contact?.email ?? (contactData as RawContact).email;
      if (!emailTo) {
        res.status(400).json({ error: `Test contact (${contactId}) has no email address in GHL` });
        return;
      }
      console.log(`[GHL test-notify] Sending email to ${emailTo}`);
      const data = await ghlREST('/conversations/messages', {
        method: 'POST',
        body: JSON.stringify({
          type: 'Email',
          contactId,
          emailTo,
          subject: subject ?? 'Test Message from TIX4SMB',
          body: message,                                   // plain text body
          html: `<p>${message.replace(/\n/g, '<br>')}</p>`, // HTML body
          locationId: cfg.location_id,
        }),
      });
      res.json({ ok: true, type, emailTo, data });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GHL test-notify]', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
