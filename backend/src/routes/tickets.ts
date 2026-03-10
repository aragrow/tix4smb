import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Ticket } from '../models/Ticket';
import { Note } from '../models/Note';
import { TicketTask } from '../models/TicketTask';
import { User } from '../models/User';
import { authenticate } from '../middleware/authenticate';
import { runTicketAgent } from '../services/ticketAgent';

const router = Router();
router.use(authenticate);

// ─── Schemas ───────────────────────────────────────────────────────

const CreateTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().optional(),
  jobber_entity_type: z.enum(['client', 'job', 'visit', 'property', 'vendor']).optional(),
  jobber_entity_id: z.string().optional(),
  jobber_entity_label: z.string().max(300).optional(),
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
  jobber_entity_type: z.enum(['client', 'job', 'visit', 'property', 'vendor']).optional(),
  jobber_entity_id: z.string().optional(),
  jobber_entity_label: z.string().max(300).optional(),
});

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
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

// ─── Tickets ───────────────────────────────────────────────────────

router.get('/api/tickets', async (req: Request, res: Response) => {
  const { status, priority, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate('created_by', 'name avatar_url')
      .populate('assigned_to', 'name avatar_url')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Ticket.countDocuments(filter),
  ]);

  res.json({ tickets, total, page: parseInt(page), limit: parseInt(limit) });
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
  const ticket = await Ticket.findByIdAndUpdate(req.params.id, result.data, { new: true })
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
