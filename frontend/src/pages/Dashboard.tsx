import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/api/client';
import type { TicketListResponse, TicketStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Plus } from 'lucide-react';

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'text-blue-400',
  in_progress: 'text-yellow-400',
  resolved: 'text-green-400',
  closed: 'text-gray-400',
};

export default function Dashboard() {
  const { data: allTickets } = useQuery<TicketListResponse>({
    queryKey: ['tickets', 'all'],
    queryFn: () => api.get<TicketListResponse>('/api/tickets?limit=200').then((r) => r.data),
  });

  const { data: recent } = useQuery<TicketListResponse>({
    queryKey: ['tickets', 'recent'],
    queryFn: () => api.get<TicketListResponse>('/api/tickets?limit=5').then((r) => r.data),
  });

  const tickets = allTickets?.tickets ?? [];
  const statusCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const statCards: { label: string; status: TicketStatus }[] = [
    { label: 'Open', status: 'open' },
    { label: 'In Progress', status: 'in_progress' },
    { label: 'Resolved', status: 'resolved' },
    { label: 'Closed', status: 'closed' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {allTickets?.total ?? 0} total tickets
          </p>
        </div>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="h-4 w-4 mr-1" />
            New Ticket
          </Link>
        </Button>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, status }) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${STATUS_COLORS[status]}`}>
                {statusCounts[status] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Tickets</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/tickets">View all</Link>
          </Button>
        </div>
        <div className="space-y-2">
          {(recent?.tickets ?? []).map((ticket) => (
            <Link key={ticket._id} to={`/tickets/${ticket._id}`}>
              <div className="flex items-start justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent/30 transition-colors gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{ticket.title}</span>
                    {(ticket.jobber_entity_type || ticket.ghl_entity_type) && (
                      <span className="flex items-center gap-1.5 mt-1 text-[11px]">
                        <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium capitalize">
                          {ticket.jobber_entity_type ?? ticket.ghl_entity_type}
                        </span>
                        {(ticket.jobber_entity_label ?? ticket.ghl_entity_label) && (
                          <span className="text-muted-foreground truncate">
                            {ticket.jobber_entity_label ?? ticket.ghl_entity_label}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <PriorityBadge priority={ticket.priority} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {recent?.tickets.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tickets yet.{' '}
              <Link to="/tickets/new" className="underline">
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
