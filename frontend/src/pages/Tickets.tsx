import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/api/client';
import type { TicketListResponse, TicketStatus, TicketPriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Plus, ChevronLeft, ChevronRight, TicketCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

const PAGE_SIZE = 20;

type SortField = 'number' | 'title' | 'status' | 'priority' | 'created';
type SortOrder = 'asc' | 'desc';

export default function Tickets() {
  const navigate = useNavigate();

  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState<TicketStatus | 'all'>('all');
  const [priority, setPriority] = useState<TicketPriority | 'all'>('all');
  const [sort, setSort]       = useState<SortField>('created');
  const [order, setOrder]     = useState<SortOrder>('desc');

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort, order });
  if (status !== 'all')   params.set('status', status);
  if (priority !== 'all') params.set('priority', priority);

  const { data, isLoading } = useQuery<TicketListResponse>({
    queryKey: ['tickets', status, priority, page, sort, order],
    queryFn: () => api.get<TicketListResponse>(`/api/tickets?${params}`).then((r) => r.data),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const hasFilters = status !== 'all' || priority !== 'all';
  const tickets = data?.tickets ?? [];

  // ── Sort helpers ───────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort !== field) return <ArrowUpDown className="h-3 w-3 opacity-30 shrink-0" />;
    return order === 'asc'
      ? <ArrowUp   className="h-3 w-3 text-primary shrink-0" />
      : <ArrowDown className="h-3 w-3 text-primary shrink-0" />;
  };

  const ColHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <button
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${sort === field ? 'text-foreground' : ''} ${className}`}
      onClick={() => handleSort(field)}
    >
      {children}
      <SortIcon field={field} />
    </button>
  );

  // ── Quick-filter from a row badge ─────────────────────────────
  const filterByStatus   = (s: TicketStatus,   e: React.MouseEvent) => { e.stopPropagation(); setStatus(s);   setPage(1); };
  const filterByPriority = (p: TicketPriority, e: React.MouseEvent) => { e.stopPropagation(); setPriority(p); setPage(1); };

  return (
    <div className="p-4 md:p-8 w-full max-w-8xl space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tickets</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? 'Loading…'
              : `${data?.total ?? 0} ${(data?.total ?? 0) === 1 ? 'ticket' : 'tickets'}${hasFilters ? ' matching filters' : ''}`}
          </p>
        </div>
        <Button asChild>
          <Link to="/tickets/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New Ticket
          </Link>
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={status} onValueChange={(v) => { setStatus(v as TicketStatus | 'all'); setPage(1); }}>
          <SelectTrigger className="w-36 h-9">
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
          <SelectTrigger className="w-36 h-9">
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

        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-muted-foreground"
            onClick={() => { setStatus('all'); setPriority('all'); setPage(1); }}>
            Clear filters
          </Button>
        )}

        {(sort !== 'created' || order !== 'desc') && (
          <Button variant="ghost" size="sm" className="text-muted-foreground"
            onClick={() => { setSort('created'); setOrder('desc'); setPage(1); }}>
            Reset sort
          </Button>
        )}
      </div>

      {/* ── Ticket list ── */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* Column headers — sortable */}
        <div className="hidden md:grid grid-cols-[7rem_1fr_8rem_8rem_7rem]
          px-5 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <ColHeader field="number">#</ColHeader>
          <ColHeader field="title">Title</ColHeader>
          <ColHeader field="status">Status</ColHeader>
          <ColHeader field="priority">Priority</ColHeader>
          <ColHeader field="created">Created</ColHeader>
        </div>

        {/* Mobile sort bar */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-xs text-muted-foreground overflow-x-auto">
          <span className="shrink-0">Sort:</span>
          {(['number','title','status','priority','created'] as SortField[]).map((f) => (
            <button
              key={f}
              onClick={() => handleSort(f)}
              className={`flex items-center gap-0.5 shrink-0 capitalize px-2 py-1 rounded transition-colors
                ${sort === f ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'}`}
            >
              {f} <SortIcon field={f} />
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground text-sm">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Loading…
          </div>
        )}

        {/* Empty */}
        {!isLoading && tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <TicketCheck className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No tickets found</p>
            {hasFilters && <p className="text-xs">Try changing your filters</p>}
            {!hasFilters && (
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link to="/tickets/new">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create your first ticket
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Rows */}
        {!isLoading && tickets.map((ticket, idx) => (
          <div
            key={ticket._id}
            className={`
              grid grid-cols-[7rem_1fr] md:grid-cols-[7rem_1fr_8rem_8rem_7rem]
              px-5 items-center cursor-pointer hover:bg-accent/30 transition-colors
              ${idx < tickets.length - 1 ? 'border-b' : ''}
            `}
            onClick={() => void navigate(`/tickets/${ticket._id}`)}
          >
            {/* # */}
            <span className="py-4 font-mono text-xs text-muted-foreground shrink-0">
              #{String(ticket.ticket_number ?? 0).padStart(7, '0')}
            </span>

            {/* Title + meta */}
            <div className="py-4 min-w-0">
              <span className="font-medium text-sm truncate block">{ticket.title}</span>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* Mobile: show badges inline; click to filter */}
                <span className="md:hidden cursor-pointer" onClick={(e) => filterByStatus(ticket.status, e)}>
                  <StatusBadge status={ticket.status} />
                </span>
                <span className="md:hidden cursor-pointer" onClick={(e) => filterByPriority(ticket.priority, e)}>
                  <PriorityBadge priority={ticket.priority} />
                </span>

                {ticket.jobber_entity_type && (
                  <span className="flex items-center gap-1 text-[10px] leading-none">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                      {ticket.jobber_entity_type}
                    </span>
                    {ticket.jobber_entity_label && (
                      <span className="text-muted-foreground">{ticket.jobber_entity_label}</span>
                    )}
                  </span>
                )}
                {ticket.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium leading-none">
                    {tag}
                  </span>
                ))}
                {(ticket.tags?.length ?? 0) > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{ticket.tags.length - 3}</span>
                )}
              </div>
            </div>

            {/* Status — click to filter */}
            <div
              className="hidden md:flex py-4 items-center cursor-pointer"
              onClick={(e) => filterByStatus(ticket.status, e)}
              title={`Filter by "${ticket.status}"`}
            >
              <StatusBadge status={ticket.status} />
            </div>

            {/* Priority — click to filter */}
            <div
              className="hidden md:flex py-4 items-center cursor-pointer"
              onClick={(e) => filterByPriority(ticket.priority, e)}
              title={`Filter by "${ticket.priority}"`}
            >
              <PriorityBadge priority={ticket.priority} />
            </div>

            {/* Date */}
            <span className="hidden md:block py-4 text-xs text-muted-foreground whitespace-nowrap">
              {new Date(ticket.created_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages} &middot; {data?.total} total
          </span>
          <div className="flex items-center gap-1">
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
