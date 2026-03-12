import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Database, ChevronDown, ChevronRight, WifiOff } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Vendor = { id: string; name: string; email?: string };

type ExplorerJob = {
  id: string;
  title?: string | null;
  jobStatus?: string;
  status?: string;
  client?: { id: string; name: string };
  property?: { address?: { street: string; city: string }; street?: string; city?: string };
};

type ExplorerVisit = {
  id: string;
  title?: string | null;
  startAt?: string | null;
  scheduledStart?: string;
  visitStatus?: string;
  status?: string;
  client?: { id: string; name: string };
  property?: { address?: { street: string; city: string }; street?: string; city?: string };
};

type ExplorerQuote = {
  id: string;
  title?: string | null;
  quoteStatus?: string;
  client?: { id: string; name: string };
  property?: { address?: { street: string; city: string }; street?: string; city?: string };
};

type ExplorerResult = {
  jobs: ExplorerJob[];
  visits: ExplorerVisit[];
  quotes: ExplorerQuote[];
};

// ─── Query preview builder ────────────────────────────────────────────────────

function buildQuery(vendorId: string): string {
  return `query GetVendorVisitsAndJobs {
  visits(first: 50) {
    nodes {
      id
      title
      startAt
      visitStatus
      assignedUsers { nodes { id } }
      client { id name }
      property { address { street city } }
      job {
        id
        title
        jobStatus
        client { id name }
        property { address { street city } }
      }
    }
  }
}

# Post-filter applied server-side:
# assignedUsers.nodes.some(u => u.id === "${vendorId}")
#
# Jobs: unique parent jobs extracted from
# matching visits (Job has no assignedUsers field)`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAddress(property?: ExplorerJob['property']): string {
  if (!property) return '—';
  const street = property.address?.street ?? property.street ?? '';
  const city = property.address?.city ?? property.city ?? '';
  if (!street && !city) return '—';
  if (city && street.toLowerCase().includes(city.toLowerCase())) return street;
  return [street, city].filter(Boolean).join(', ');
}

function statusBadge(status?: string): string {
  const s = (status ?? '').toLowerCase();
  if (['active', 'scheduled', 'approved'].includes(s)) return 'bg-green-100 text-green-800';
  if (['completed'].includes(s)) return 'bg-gray-100 text-gray-600';
  if (['cancelled', 'void', 'lost'].includes(s)) return 'bg-red-100 text-red-700';
  return 'bg-blue-100 text-blue-700';
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 text-sm font-medium hover:bg-muted/60 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {title}
        </span>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </button>
      {open && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JobberExplorer() {
  const [selectedId, setSelectedId] = useState('');
  const [results, setResults] = useState<ExplorerResult | null>(null);

  const { data: vendors, error: vendorsError } = useQuery<Vendor[]>({
    queryKey: ['explorer-vendors'],
    queryFn: () => api.get<Vendor[]>('/api/jobber/explorer/vendors').then((r) => r.data),
    retry: false,
  });

  const runQuery = useMutation({
    mutationFn: () =>
      api.get<ExplorerResult>(`/api/jobber/explorer/vendor?id=${encodeURIComponent(selectedId)}`).then((r) => r.data),
    onSuccess: setResults,
  });

  const selectedVendor = vendors?.find((v) => v.id === selectedId);

  return (
    <div className="h-full flex flex-col p-4 gap-3">

      {/* Header */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h1 className="font-semibold">Jobber Explorer</h1>
        <Badge variant="outline" className="text-xs text-green-700 border-green-400">Live Data</Badge>
      </div>

      {/* Not connected banner */}
      {vendorsError && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 text-destructive text-sm flex-shrink-0">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          Jobber is not connected. Go to Settings to connect your Jobber account.
        </div>
      )}

      {/* 3-pane body */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* Pane 1 — Parameters */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-3">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Entity Type</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <Badge variant="secondary">Vendor</Badge>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Vendor</label>
                <Select
                  value={selectedId}
                  onValueChange={(v) => { setSelectedId(v); setResults(null); }}
                  disabled={!!vendorsError}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={vendorsError ? 'Not connected' : 'Select vendor…'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(vendors ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVendor?.email && (
                  <p className="text-xs text-muted-foreground truncate">{selectedVendor.email}</p>
                )}
              </div>

              <Button
                size="sm"
                className="w-full gap-1.5"
                disabled={!selectedId || runQuery.isPending || !!vendorsError}
                onClick={() => runQuery.mutate()}
              >
                <Play className="h-3 w-3" />
                {runQuery.isPending ? 'Running…' : 'Run Query'}
              </Button>

              {runQuery.isError && (
                <p className="text-xs text-destructive">
                  {(runQuery.error as Error)?.message ?? 'Query failed'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pane 2 — Query Preview */}
        <Card className="w-96 flex-shrink-0 flex flex-col min-h-0">
          <CardHeader className="py-2 px-3 flex-shrink-0 border-b">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">GraphQL Query</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0 min-h-0">
            <pre className="text-[11px] p-3 font-mono text-foreground/70 whitespace-pre leading-relaxed">
              {selectedId
                ? buildQuery(selectedId)
                : '# Select a vendor to preview\n# the query that will run'}
            </pre>
          </CardContent>
        </Card>

        {/* Pane 3 — Results */}
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="py-2 px-3 flex-shrink-0 border-b">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              Results
              {results && (
                <span className="font-normal normal-case text-foreground/60">
                  {results.jobs.length} jobs · {results.visits.length} visits · {results.quotes.length} quotes
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-3 space-y-3 min-h-0">

            {!results && !runQuery.isPending && (
              <p className="text-sm text-muted-foreground text-center mt-12">
                Select a vendor and click Run Query
              </p>
            )}

            {runQuery.isPending && (
              <p className="text-sm text-muted-foreground text-center mt-12">Running query…</p>
            )}

            {results && (
              <>
                {/* Jobs */}
                <Section title="Jobs" count={results.jobs.length}>
                  {results.jobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No jobs found for this vendor</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-0 whitespace-nowrap">ID</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Client</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.jobs.map((j, i) => (
                          <tr key={j.id} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {j.id.slice(-6)}
                            </td>
                            <td className="px-3 py-1.5 font-medium">{j.title ?? `Job #${j.id}`}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge(j.jobStatus ?? j.status)}`}>
                                {j.jobStatus ?? j.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{j.client?.name ?? '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{getAddress(j.property)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>

                {/* Visits */}
                <Section title="Visits" count={results.visits.length}>
                  {results.visits.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">No visits found for this vendor</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-0 whitespace-nowrap">ID</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Client</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.visits.map((v, i) => (
                          <tr key={v.id} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {v.id.slice(-6)}
                            </td>
                            <td className="px-3 py-1.5 font-medium">{v.title ?? 'Visit'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                              {(v.startAt ?? v.scheduledStart ?? '').slice(0, 10) || '—'}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge(v.visitStatus ?? v.status)}`}>
                                {v.visitStatus ?? v.status ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{v.client?.name ?? '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{getAddress(v.property)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>

                {/* Quotes */}
                <Section title="Quotes" count={results.quotes.length}>
                  {results.quotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      Quotes are not directly linked to vendors in Jobber's API
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-0 whitespace-nowrap">ID</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Client</th>
                          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.quotes.map((q, i) => (
                          <tr key={q.id} className={i % 2 === 0 ? '' : 'bg-muted/10'}>
                            <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {q.id.slice(-6)}
                            </td>
                            <td className="px-3 py-1.5 font-medium">{q.title ?? `Quote #${q.id}`}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge(q.quoteStatus)}`}>
                                {q.quoteStatus ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{q.client?.name ?? '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{getAddress(q.property)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Section>
              </>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
