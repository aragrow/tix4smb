import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/api/client';
import type { Ticket, TicketTask, JobberJob, JobberVisit } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Send, Bell, FileText } from 'lucide-react';
import { isMockJobberEnabled } from '@/hooks/useMockJobber';
import { MOCK_JOBS, MOCK_VISITS } from '@/lib/mockJobberData';

interface BulkMessageModalProps {
  type: 'notify' | 'rfp';
  ticketId: string;
  selectedTasks: TicketTask[];
  onClose: () => void;
  onSend: (message: string) => void;
  isSending?: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  Client:   'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Vendor:   'bg-violet-500/10 text-violet-500 border-violet-500/20',
  Property: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  Contact:  'bg-muted text-muted-foreground border-border',
};

export function BulkMessageModal({
  type,
  ticketId,
  selectedTasks,
  onClose,
  onSend,
  isSending,
}: BulkMessageModalProps) {
  const [message, setMessage] = useState('');
  const useMock = isMockJobberEnabled();

  // Fetch the ticket so we can fall back to its Jobber entity
  const { data: ticket } = useQuery<Ticket>({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.get<Ticket>(`/api/tickets/${ticketId}`).then((r) => r.data),
  });

  const hasJobTasks    = selectedTasks.some((t) => t.jobber_entity_type === 'job');
  const hasVisitTasks  = selectedTasks.some((t) => t.jobber_entity_type === 'visit');
  const ticketIsJob    = ticket?.jobber_entity_type === 'job';
  const ticketIsVisit  = ticket?.jobber_entity_type === 'visit';

  const { data: jobs = [] } = useQuery<JobberJob[]>({
    queryKey: ['jobber-jobs', useMock],
    queryFn: () => useMock ? Promise.resolve(MOCK_JOBS) : api.get<JobberJob[]>('/api/jobber/jobs').then((r) => r.data),
    enabled: hasJobTasks || ticketIsJob,
  });

  const { data: visits = [] } = useQuery<JobberVisit[]>({
    queryKey: ['jobber-visits', useMock],
    queryFn: () => useMock ? Promise.resolve(MOCK_VISITS) : api.get<JobberVisit[]>('/api/jobber/visits').then((r) => r.data),
    enabled: hasVisitTasks || ticketIsVisit,
  });

  // Resolve a single client entry from a job or visit id
  const clientFromJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.client ? { id: job.client.id, name: job.client.name } : null;
  };
  const clientFromVisit = (visitId: string) => {
    const visit = visits.find((v) => v.id === visitId);
    return visit?.client ? { id: visit.client.id, name: visit.client.name } : null;
  };

  // Build recipient map — keyed by client/entity id to deduplicate
  const recipientMap = new Map<string, { label: string; role: string }>();

  // 1. From task-level entities
  for (const t of selectedTasks) {
    const key   = t.jobber_entity_id ?? t.jobber_entity_label ?? '';
    const label = t.jobber_entity_label ?? t.jobber_entity_id ?? '';
    if (!key) continue;

    if (t.jobber_entity_type === 'client') {
      recipientMap.set(key, { label, role: 'Client' });
    } else if (t.jobber_entity_type === 'job' && t.jobber_entity_id) {
      const client = clientFromJob(t.jobber_entity_id);
      recipientMap.set(client?.id ?? key, { label: client?.name ?? label, role: 'Client' });
    } else if (t.jobber_entity_type === 'visit' && t.jobber_entity_id) {
      const client = clientFromVisit(t.jobber_entity_id);
      recipientMap.set(client?.id ?? key, { label: client?.name ?? label, role: 'Client' });
    } else if (t.jobber_entity_type === 'vendor') {
      recipientMap.set(key, { label, role: 'Vendor' });
    } else if (t.jobber_entity_type === 'property') {
      recipientMap.set(key, { label, role: 'Property' });
    }
  }

  // 2. Fall back to the ticket's own Jobber entity if no recipients resolved yet
  if (recipientMap.size === 0 && ticket?.jobber_entity_id) {
    const entityId = ticket.jobber_entity_id;
    const fallbackLabel = ticket.jobber_entity_label ?? entityId;

    if (ticketIsJob) {
      const client = clientFromJob(entityId);
      recipientMap.set(client?.id ?? entityId, { label: client?.name ?? fallbackLabel, role: 'Client' });
    } else if (ticketIsVisit) {
      const client = clientFromVisit(entityId);
      recipientMap.set(client?.id ?? entityId, { label: client?.name ?? fallbackLabel, role: 'Client' });
    } else if (ticket.jobber_entity_type === 'client') {
      recipientMap.set(entityId, { label: fallbackLabel, role: 'Client' });
    } else if (ticket.jobber_entity_type === 'vendor') {
      recipientMap.set(entityId, { label: fallbackLabel, role: 'Vendor' });
    } else if (ticket.jobber_entity_type === 'property') {
      recipientMap.set(entityId, { label: fallbackLabel, role: 'Property' });
    }
  }

  const recipients = [...recipientMap.values()];

  const contextLine = recipients.map((r) => `${r.role}: ${r.label}`).join(', ');

  const enhance = useMutation({
    mutationFn: () =>
      api.post<{ enhanced: string }>(`/api/tickets/${ticketId}/ai-enhance`, {
        message: message.trim() || (type === 'notify' ? 'Write a professional notification message.' : 'Write a professional request for proposal.'),
        type,
        context: contextLine || undefined,
      }).then((r) => r.data),
    onSuccess: (data) => setMessage(data.enhanced),
  });

  const title       = type === 'notify' ? 'Send Notification' : 'Send RFP';
  const Icon        = type === 'notify' ? Bell : FileText;
  const placeholder = type === 'notify'
    ? 'Write your notification message...'
    : 'Describe your request for proposal...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border shadow-2xl w-full max-w-lg space-y-5 p-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Message editor */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Message
          </p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            rows={7}
            className="resize-none text-sm"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => enhance.mutate()}
            disabled={enhance.isPending}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {enhance.isPending ? 'Enhancing…' : 'AI Enhance'}
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSend(message)}
            disabled={isSending}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
