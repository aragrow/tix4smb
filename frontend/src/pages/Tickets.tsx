import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/api/client';
import type { TicketListResponse, TicketStatus, TicketPriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

export default function Tickets() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TicketStatus | 'all'>('all');
  const [priority, setPriority] = useState<TicketPriority | 'all'>('all');

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status !== 'all') params.set('status', status);
  if (priority !== 'all') params.set('priority', priority);

  const { data, isLoading } = useQuery<TicketListResponse>({
    queryKey: ['tickets', status, priority, page],
    queryFn: () => api.get<TicketListResponse>(`/api/tickets?${params}`).then((r) => r.data),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tickets</h2>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v as TicketStatus | 'all'); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(v) => { setPriority(v as TicketPriority | 'all'); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {(status !== 'all' || priority !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setStatus('all'); setPriority('all'); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-card">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24">#</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : data?.tickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  No tickets found.
                </td>
              </tr>
            ) : (
              data?.tickets.map((ticket) => (
                <tr
                  key={ticket._id}
                  className="border-b last:border-0 hover:bg-accent/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    #{String(ticket.ticket_number ?? 0).padStart(7, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/tickets/${ticket._id}`}
                      className="font-medium hover:underline"
                    >
                      {ticket.title}
                    </Link>
                    {ticket.jobber_entity_type && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        [{ticket.jobber_entity_type}]
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total} total)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
