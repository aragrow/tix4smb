import { Badge } from '@/components/ui/badge';
import type { TicketStatus, TicketPriority } from '@/types';

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={status as TicketStatus}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant={priority as TicketPriority}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
