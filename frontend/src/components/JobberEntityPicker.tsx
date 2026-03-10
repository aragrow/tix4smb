import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import type { JobberClient, JobberProperty, JobberJob, JobberVisit, JobberEntityType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isMockJobberEnabled } from '@/hooks/useMockJobber';
import { MOCK_CLIENTS, MOCK_PROPERTIES, MOCK_JOBS, MOCK_VISITS } from '@/lib/mockJobberData';

interface JobberEntityPickerProps {
  entityType: JobberEntityType | '';
  entityId: string;
  onTypeChange: (type: JobberEntityType | '') => void;
  onIdChange: (id: string) => void;
  onLabelChange?: (label: string) => void;
}

export function JobberEntityPicker({
  entityType,
  entityId,
  onTypeChange,
  onIdChange,
  onLabelChange,
}: JobberEntityPickerProps) {
  const useMock = isMockJobberEnabled();

  const { data: clients = [] } = useQuery<JobberClient[]>({
    queryKey: ['jobber-clients', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_CLIENTS)
        : api.get<JobberClient[]>('/api/jobber/clients').then((r) => r.data),
    enabled: entityType === 'client',
  });

  const { data: properties = [] } = useQuery<JobberProperty[]>({
    queryKey: ['jobber-properties', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_PROPERTIES)
        : api.get<JobberProperty[]>('/api/jobber/properties').then((r) => r.data),
    enabled: entityType === 'property',
  });

  const { data: jobs = [] } = useQuery<JobberJob[]>({
    queryKey: ['jobber-jobs', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_JOBS)
        : api.get<JobberJob[]>('/api/jobber/jobs').then((r) => r.data),
    enabled: entityType === 'job',
  });

  const { data: visits = [] } = useQuery<JobberVisit[]>({
    queryKey: ['jobber-visits', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_VISITS)
        : api.get<JobberVisit[]>('/api/jobber/visits').then((r) => r.data),
    enabled: entityType === 'visit',
  });

  const handleIdChange = (id: string, label: string) => {
    onIdChange(id);
    onLabelChange?.(label);
  };

  return (
    <div className="flex gap-2">
      <Select
        value={entityType || '__none__'}
        onValueChange={(v) => {
          onTypeChange(v === '__none__' ? '' : v as JobberEntityType);
          onIdChange('');
          onLabelChange?.('');
        }}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Entity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          <SelectItem value="client">Client</SelectItem>
          <SelectItem value="property">Property</SelectItem>
          <SelectItem value="job">Job</SelectItem>
          <SelectItem value="visit">Visit</SelectItem>
          <SelectItem value="vendor">Vendor</SelectItem>
        </SelectContent>
      </Select>

      {entityType === 'client' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const c = clients.find((x) => x.id === id);
            handleIdChange(id, c?.name ?? id);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select client..." />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entityType === 'property' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const p = properties.find((x) => x.id === id);
            const label = p ? `${p.street}, ${p.city} — ${p.client.name}` : id;
            handleIdChange(id, label);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select property..." />
          </SelectTrigger>
          <SelectContent>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.street}, {p.city} — {p.client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entityType === 'job' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const j = jobs.find((x) => x.id === id);
            const label = j
              ? `${j.title} — ${j.client?.name ?? ''}${j.property ? ` · ${j.property.street}` : ''}`
              : id;
            handleIdChange(id, label);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select job..." />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title} — {j.client?.name ?? ''}{j.property ? ` · ${j.property.street}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entityType === 'visit' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const v = visits.find((x) => x.id === id);
            const label = v
              ? `${v.scheduledStart} · ${v.title} — ${v.property.street}, ${v.property.city}`
              : id;
            handleIdChange(id, label);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select visit..." />
          </SelectTrigger>
          <SelectContent>
            {visits.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.scheduledStart} · {v.title} — {v.property.street}, {v.property.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entityType === 'vendor' && (
        <input
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
          placeholder="Enter vendor ID..."
          value={entityId}
          onChange={(e) => {
            onIdChange(e.target.value);
            onLabelChange?.(e.target.value);
          }}
        />
      )}
    </div>
  );
}
