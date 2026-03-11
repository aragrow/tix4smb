import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Ticket } from '../models/Ticket';
import { Note } from '../models/Note';
import { TicketTask } from '../models/TicketTask';
import { User } from '../models/User';
import { authenticate } from '../middleware/authenticate';
import { runTicketAgent } from '../services/ticketAgent';
import { loadAIConfig } from '../services/aiConfig';
import { runRFP } from '../services/rfpService';
import { env } from '../config/env';

const router = Router();
router.use(authenticate);

// ─── Schemas ───────────────────────────────────────────────────────

const CreateTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().optional(),
  jobber_entity_type: z.enum(['client', 'job', 'visit', 'property', 'vendor', 'lead']).optional(),
  jobber_entity_id: z.string().optional(),
  jobber_entity_label: z.string().max(300).optional(),
  ghl_entity_type: z.enum(['contact', 'opportunity', 'appointment']).optional(),
  ghl_entity_id: z.string().optional(),
  ghl_entity_label: z.string().max(300).optional(),
  tags: z.array(z.string()).default([]),
});

const UpdateTicketSchema = CreateTicketSchema.partial().extend({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
});

const CreateNoteSchema = z.object({
  body: z.string().min(1).max(10000),
});

const CreateTaskSchema = z.object({
  description: z.string().min(1).max(2000),
  jobber_entity_type: z.enum(['client', 'job', 'visit', 'property', 'vendor', 'lead']).optional(),
  jobber_entity_id: z.string().optional(),
  jobber_entity_label: z.string().max(300).optional(),
});

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'done', 'sent']).optional(),
  notes: z.string().max(5000).optional(),
});

// ─── Current user ──────────────────────────────────────────────────

router.get('/api/me', async (req: Request, res: Response) => {
  const user = await User.findById(req.authUser!.id).select('-__v');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// ─── Bulk actions (must come before /:id routes) ───────────────────

const BulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  action: z.enum(['delete', 'status', 'notify', 'rfp']),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
});

router.post('/api/tickets/bulk', async (req: Request, res: Response) => {
  const result = BulkSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const { ids, action, status } = result.data;

  switch (action) {
    case 'delete':
      await Ticket.deleteMany({ _id: { $in: ids } });
      await Note.deleteMany({ ticket_ref: { $in: ids } });
      await TicketTask.deleteMany({ ticket_ref: { $in: ids } });
      break;

    case 'status':
      if (!status) { res.status(400).json({ error: 'status required' }); return; }
      await Ticket.updateMany({ _id: { $in: ids } }, { status, updated_at: new Date() });
      break;

    case 'notify':
      await Note.insertMany(ids.map((id) => ({
        ticket_ref: id,
        body: 'Notification sent to stakeholders.',
        agent_generated: true,
        created_at: new Date(),
      })));
      break;

    case 'rfp':
      await Note.insertMany(ids.map((id) => ({
        ticket_ref: id,
        body: 'Request for Proposal (RFP) sent.',
        agent_generated: true,
        created_at: new Date(),
      })));
      break;
  }

  res.json({ ok: true, count: ids.length });
});

// ─── Tickets ───────────────────────────────────────────────────────

router.get('/api/tickets', async (req: Request, res: Response) => {
  const {
    status, priority, page = '1', limit = '20',
    sort = 'created', order = 'desc',
  } = req.query as Record<string, string>;

  const match: Record<string, unknown> = {};
  if (status) match.status = status;
  if (priority) match.priority = priority;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const dir = order === 'asc' ? 1 : -1;

  const SORT_FIELDS: Record<string, string> = {
    number:   'ticket_number',
    title:    'title',
    status:   'statusOrder',
    priority: 'priorityOrder',
    created:  'created_at',
  };
  const sortField = SORT_FIELDS[sort] ?? 'created_at';

  const [result] = await Ticket.aggregate([
    { $match: match },
    {
      $addFields: {
        priorityOrder: {
          $switch: {
            branches: [
              { case: { $eq: ['$priority', 'low'] },    then: 1 },
              { case: { $eq: ['$priority', 'medium'] }, then: 2 },
              { case: { $eq: ['$priority', 'high'] },   then: 3 },
              { case: { $eq: ['$priority', 'urgent'] }, then: 4 },
            ],
            default: 0,
          },
        },
        statusOrder: {
          $switch: {
            branches: [
              { case: { $eq: ['$status', 'open'] },        then: 1 },
              { case: { $eq: ['$status', 'in_progress'] }, then: 2 },
              { case: { $eq: ['$status', 'resolved'] },    then: 3 },
              { case: { $eq: ['$status', 'closed'] },      then: 4 },
            ],
            default: 0,
          },
        },
      },
    },
    { $sort: { [sortField]: dir as 1 | -1, _id: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: parseInt(limit) },
          { $lookup: { from: 'users', localField: 'created_by',  foreignField: '_id', as: 'created_by_arr'  } },
          { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assigned_to_arr' } },
          {
            $addFields: {
              created_by: {
                $let: {
                  vars: { u: { $arrayElemAt: ['$created_by_arr', 0] } },
                  in: { _id: '$$u._id', name: '$$u.name', avatar_url: '$$u.avatar_url' },
                },
              },
              assigned_to: {
                $cond: {
                  if: { $gt: [{ $size: '$assigned_to_arr' }, 0] },
                  then: {
                    $let: {
                      vars: { u: { $arrayElemAt: ['$assigned_to_arr', 0] } },
                      in: { _id: '$$u._id', name: '$$u.name', avatar_url: '$$u.avatar_url' },
                    },
                  },
                  else: null,
                },
              },
            },
          },
          { $project: { created_by_arr: 0, assigned_to_arr: 0, priorityOrder: 0, statusOrder: 0 } },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  res.json({
    tickets: result?.data ?? [],
    total:   result?.total?.[0]?.count ?? 0,
    page:    parseInt(page),
    limit:   parseInt(limit),
  });
});

router.post('/api/tickets', async (req: Request, res: Response) => {
  const result = CreateTicketSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const ticket = await Ticket.create({ ...result.data, created_by: req.authUser!.id });
  void runTicketAgent(String(ticket._id));
  res.status(201).json(ticket);
});

router.get('/api/tickets/:id', async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('created_by', 'name avatar_url')
    .populate('assigned_to', 'name avatar_url')
    .lean();
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

router.patch('/api/tickets/:id', async (req: Request, res: Response) => {
  const result = UpdateTicketSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const update: Record<string, unknown> = { ...result.data };
  if (result.data.status === 'closed') {
    update.completed_at = new Date();
  } else if (result.data.status && result.data.status !== 'closed') {
    update.completed_at = null;
  }
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('created_by', 'name avatar_url')
    .lean();
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

router.delete('/api/tickets/:id', async (req: Request, res: Response) => {
  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  await Promise.all([
    Note.deleteMany({ ticket_ref: req.params.id }),
    TicketTask.deleteMany({ ticket_ref: req.params.id }),
  ]);
  res.json({ ok: true });
});

// ─── Notes ─────────────────────────────────────────────────────────

router.get('/api/tickets/:id/notes', async (req: Request, res: Response) => {
  const notes = await Note.find({ ticket_ref: req.params.id })
    .populate('author', 'name avatar_url')
    .sort({ created_at: 1 })
    .lean();
  res.json(notes);
});

router.post('/api/tickets/:id/notes', async (req: Request, res: Response) => {
  const result = CreateNoteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const note = await Note.create({
    ticket_ref: req.params.id,
    body: result.data.body,
    author: req.authUser!.id,
  });
  await note.populate('author', 'name avatar_url');
  res.status(201).json(note);
});

router.patch('/api/tickets/:id/notes/:noteId', async (req: Request, res: Response) => {
  const result = CreateNoteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const note = await Note.findOneAndUpdate(
    { _id: req.params.noteId, ticket_ref: req.params.id, agent_generated: { $ne: true } },
    { body: result.data.body },
    { new: true }
  ).populate('author', 'name avatar_url');
  if (!note) {
    res.status(404).json({ error: 'Note not found or not editable' });
    return;
  }
  res.json(note);
});

router.delete('/api/tickets/:id/notes/:noteId', async (req: Request, res: Response) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.noteId,
    ticket_ref: req.params.id,
    agent_generated: { $ne: true },
  });
  if (!note) {
    res.status(404).json({ error: 'Note not found or not deletable' });
    return;
  }
  res.json({ ok: true });
});

// ─── Run agent manually ────────────────────────────────────────────

router.post('/api/tickets/:id/run-agent', async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  void runTicketAgent(req.params.id);
  res.json({ ok: true });
});

// ─── AI message enhance ────────────────────────────────────────────

router.post('/api/tickets/:id/ai-enhance', async (req: Request, res: Response) => {
  const schema = z.object({
    message: z.string().min(1).max(5000),
    type: z.enum(['notify', 'rfp']),
    context: z.string().max(2000).optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }

  const { message, type, context } = result.data;
  const config = loadAIConfig();

  const systemPrompt = type === 'notify'
    ? 'You are a professional business communications assistant. Enhance the following notification message to be clear, professional, and actionable. Preserve the original intent but improve clarity and tone. Return only the enhanced message text, no extra commentary.'
    : 'You are a professional business communications assistant. Enhance the following Request for Proposal (RFP) to be clear, professional, and comprehensive. Preserve the original intent but improve clarity and structure. Return only the enhanced message text, no extra commentary.';

  const userMessage = context ? `${context}\n\nMessage:\n${message}` : message;

  try {
    let enhanced = message;

    if (config.provider === 'anthropic' && env.ANTHROPIC_API_KEY) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model: config.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      enhanced = resp.content[0].type === 'text' ? resp.content[0].text : message;

    } else if (config.provider === 'openai' && env.OPENAI_API_KEY) {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const resp = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
      enhanced = resp.choices[0].message.content ?? message;

    } else if (config.provider === 'google' && env.GOOGLE_API_KEY) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: config.model, systemInstruction: systemPrompt });
      const resp = await model.generateContent(userMessage);
      enhanced = resp.response.text();
    }

    res.json({ enhanced });
  } catch (err) {
    console.error('[AI Enhance]', err);
    res.status(500).json({ error: 'Failed to enhance message' });
  }
});

// ─── Tasks ─────────────────────────────────────────────────────────

router.get('/api/tickets/:id/tasks', async (req: Request, res: Response) => {
  const tasks = await TicketTask.find({ ticket_ref: req.params.id })
    .sort({ created_at: 1 })
    .lean();
  res.json(tasks);
});

router.post('/api/tickets/:id/tasks', async (req: Request, res: Response) => {
  const result = CreateTaskSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  const task = await TicketTask.create({ ...result.data, ticket_ref: req.params.id });
  res.status(201).json(task);
});

router.patch('/api/tickets/:id/tasks/:taskId', async (req: Request, res: Response) => {
  const result = UpdateTaskSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const task = await TicketTask.findOneAndUpdate(
    { _id: req.params.taskId, ticket_ref: req.params.id },
    result.data,
    { new: true }
  );
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

// ─── RFP ────────────────────────────────────────────────────────────

router.post('/api/tickets/:id/tasks/rfp', async (req: Request, res: Response) => {
  const schema = z.object({ taskIds: z.array(z.string()).min(1).max(200) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten() });
    return;
  }
  try {
    const result = await runRFP(req.params.id, parsed.data.taskIds);
    res.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[RFP route]', msg);
    res.status(500).json({ error: msg });
  }
});

router.post('/api/tickets/:id/tasks/bulk', async (req: Request, res: Response) => {
  const schema = z.object({
    ids: z.array(z.string()).min(1).max(200),
    action: z.enum(['delete', 'status', 'notify', 'rfp']),
    status: z.enum(['pending', 'in_progress', 'done']).optional(),
    message: z.string().max(5000).optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.flatten() });
    return;
  }
  const { ids, action, status, message } = result.data;

  switch (action) {
    case 'delete':
      await TicketTask.deleteMany({ _id: { $in: ids }, ticket_ref: req.params.id });
      break;

    case 'status':
      if (!status) { res.status(400).json({ error: 'status required' }); return; }
      await TicketTask.updateMany(
        { _id: { $in: ids }, ticket_ref: req.params.id },
        { status, updated_at: new Date() }
      );
      break;

    case 'notify': {
      const n = ids.length;
      await TicketTask.updateMany(
        { _id: { $in: ids }, ticket_ref: req.params.id },
        { status: 'sent', updated_at: new Date() }
      );
      await Note.create({
        ticket_ref: req.params.id,
        body: message
          ? `Notification sent (${n} task${n !== 1 ? 's' : ''}):\n\n${message}`
          : `Notification sent for ${n} task${n !== 1 ? 's' : ''}.`,
        agent_generated: true,
        created_at: new Date(),
      });
      break;
    }

    case 'rfp': {
      const n = ids.length;
      await TicketTask.updateMany(
        { _id: { $in: ids }, ticket_ref: req.params.id },
        { status: 'sent', updated_at: new Date() }
      );
      await Note.create({
        ticket_ref: req.params.id,
        body: message
          ? `Request for Proposal (RFP) sent (${n} task${n !== 1 ? 's' : ''}):\n\n${message}`
          : `Request for Proposal (RFP) sent for ${n} task${n !== 1 ? 's' : ''}.`,
        agent_generated: true,
        created_at: new Date(),
      });
      break;
    }
  }

  res.json({ ok: true, count: ids.length });
});

router.delete('/api/tickets/:id/tasks/:taskId', async (req: Request, res: Response) => {
  const task = await TicketTask.findOneAndDelete({
    _id: req.params.taskId,
    ticket_ref: req.params.id,
  });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
