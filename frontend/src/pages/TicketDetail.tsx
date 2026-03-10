import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type { Ticket, TicketStatus, TicketPriority, TicketTask, JobberEntityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { NoteThread } from '@/components/NoteThread';
import { TaskList } from '@/components/TaskList';
import { ChevronLeft, Trash2, Pencil, Check, X, Bot, Loader2, CheckCircle } from 'lucide-react';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  client: 'Client',
  job: 'Job',
  visit: 'Visit',
  property: 'Property',
  vendor: 'Vendor',
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  client:   'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  job:      'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  visit:    'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  property: 'bg-green-500/15 text-green-600 dark:text-green-400',
  vendor:   'bg-slate-500/15 text-slate-600 dark:text-slate-400',
};

function JobberEntityDisplay({
  type,
  id,
  label,
  entityInfo,
}: {
  type: JobberEntityType;
  id: string;
  label?: string;
  entityInfo?: { type: string; id: string; label: string; name?: string; title?: string; scheduledStart?: string; address?: string; client?: { name: string } };
}) {
  const typeLabel = ENTITY_TYPE_LABELS[type] ?? type;
  const typeColor = ENTITY_TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground';

  // Derive primary name and secondary detail lines
  let primary = label ?? id;
  const secondary: string[] = [];

  if (entityInfo) {
    if (type === 'client') {
      primary = entityInfo.name ?? entityInfo.label;
    } else if (type === 'job') {
      primary = entityInfo.title ?? entityInfo.label;
      if (entityInfo.address) secondary.push(entityInfo.address);
      if (entityInfo.client) secondary.push(`Client: ${entityInfo.client.name}`);
    } else if (type === 'visit') {
      primary = entityInfo.title ?? entityInfo.label;
      if (entityInfo.scheduledStart) secondary.push(entityInfo.scheduledStart);
      if (entityInfo.address) secondary.push(entityInfo.address);
      if (entityInfo.client) secondary.push(`Client: ${entityInfo.client.name}`);
    } else {
      primary = entityInfo.label;
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm flex items-center gap-2">
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeColor}`}>
          {typeLabel}
        </span>
        {primary}
      </p>
      {secondary.map((line, i) => (
        <p key={i} className="text-xs text-muted-foreground mt-0.5">{line}</p>
      ))}
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [agentState, setAgentState] = useState<'idle' | 'running' | 'done'>('idle');
  const agentNoteBaselineRef = useRef<number | null>(null);

  const { data: tasks } = useQuery<TicketTask[]>({
    queryKey: ['tasks', id],
    queryFn: () => api.get<TicketTask[]>(`/api/tickets/${id!}/tasks`).then((r) => r.data),
    enabled: Boolean(id),
    refetchInterval: agentState === 'running' ? 2000 : false,
  });

  useEffect(() => {
    if (agentState !== 'running') return;
    const baseline = agentNoteBaselineRef.current ?? 0;
    if ((tasks?.length ?? 0) > baseline) {
      setAgentState('done');
      const t = setTimeout(() => setAgentState('idle'), 3000);
      return () => clearTimeout(t);
    }
  }, [agentState, tasks?.length]);

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['ticket', id],
    queryFn: () => api.get<Ticket>(`/api/tickets/${id!}`).then((r) => r.data),
    enabled: Boolean(id),
  });

  // Fetch rich entity details when ticket has entity but no stored label
  const needsEntityLookup = Boolean(
    ticket?.jobber_entity_type && ticket.jobber_entity_id && !ticket.jobber_entity_label
  );
  const { data: entityInfo } = useQuery<{ type: string; id: string; label: string; name?: string; title?: string; scheduledStart?: string; address?: string; client?: { name: string } }>({
    queryKey: ['jobber-entity', ticket?.jobber_entity_type, ticket?.jobber_entity_id],
    queryFn: () =>
      api
        .get(`/api/jobber/entity?type=${ticket!.jobber_entity_type!}&id=${ticket!.jobber_entity_id!}`)
        .then((r) => r.data),
    enabled: needsEntityLookup,
    staleTime: 5 * 60 * 1000,
  });

  const updateTicket = useMutation({
    mutationFn: (patch: Partial<Ticket>) =>
      api.patch<Ticket>(`/api/tickets/${id!}`, patch).then((r) => r.data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setEditingDesc(false);
    },
  });

  const runAgent = useMutation({
    mutationFn: () => api.post(`/api/tickets/${id!}/run-agent`),
    onMutate: () => {
      agentNoteBaselineRef.current = tasks?.length ?? 0;
      setAgentState('running');
    },
    onError: () => setAgentState('idle'),
  });

  const deleteTicket = useMutation({
    mutationFn: () => api.delete(`/api/tickets/${id!}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      void navigate('/tickets');
    },
  });

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Ticket not found.</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link to="/tickets">← Back to tickets</Link>
        </Button>
      </div>
    );
  }

  const editable = ticket.status !== 'closed';

  const startEditDesc = () => {
    setDescDraft(ticket.description ?? '');
    setEditingDesc(true);
  };

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/tickets">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded select-all">
          #{String(ticket.ticket_number ?? 0).padStart(7, '0')}
        </span>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{ticket.title}</h2>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <Select
              value={ticket.status}
              onValueChange={(v) => updateTicket.mutate({ status: v as TicketStatus })}
            >
              <SelectTrigger className="h-7 w-auto gap-1">
                <StatusBadge status={ticket.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Priority</span>
            <Select
              value={ticket.priority}
              onValueChange={(v) => updateTicket.mutate({ priority: v as TicketPriority })}
            >
              <SelectTrigger className="h-7 w-auto gap-1">
                <PriorityBadge priority={ticket.priority} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => runAgent.mutate()}
            disabled={agentState === 'running'}
            title="Re-run the AI agent to analyze this ticket and add notes"
          >
            {agentState === 'running' ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : agentState === 'done' ? (
              <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
            ) : (
              <Bot className="h-4 w-4 mr-1" />
            )}
            {agentState === 'running' ? 'Running...' : agentState === 'done' ? 'Done!' : 'Run AI'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive-foreground hover:bg-destructive/20"
            onClick={() => {
              if (confirm('Delete this ticket?')) deleteTicket.mutate();
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Created by</p>
          <p>{ticket.created_by.name}</p>
        </div>
        {ticket.assigned_to && (
          <div>
            <p className="text-muted-foreground text-xs mb-1">Assigned to</p>
            <p>{ticket.assigned_to.name}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground text-xs mb-1">Created</p>
          <p>{new Date(ticket.created_at).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Updated</p>
          <p>{new Date(ticket.updated_at).toLocaleString()}</p>
        </div>
        {ticket.jobber_entity_type && (
          <div>
            <p className="text-muted-foreground text-xs mb-1">Jobber entity</p>
            <JobberEntityDisplay
              type={ticket.jobber_entity_type}
              id={ticket.jobber_entity_id ?? ''}
              label={ticket.jobber_entity_label}
              entityInfo={entityInfo}
            />
          </div>
        )}
        {ticket.tags.length > 0 && (
          <div>
            <p className="text-muted-foreground text-xs mb-1">Tags</p>
            <p>{ticket.tags.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Description
          </h3>
          {editable && !editingDesc && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEditDesc}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        {editingDesc ? (
          <div className="space-y-2">
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Describe the issue..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateTicket.mutate({ description: descDraft })}
                disabled={updateTicket.isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : ticket.description ? (
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {editable ? 'No description — click edit to add one.' : 'No description.'}
          </p>
        )}
      </div>

      {/* Tasks */}
      <div className="border-t pt-8">
        <TaskList ticketId={ticket._id} ticketStatus={ticket.status} agentRunning={agentState === 'running'} />
      </div>

      {/* Notes */}
      <div className="border-t pt-8">
        <NoteThread ticketId={ticket._id} ticketStatus={ticket.status} />
      </div>
    </div>
  );
}
