import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import api from '@/api/client';
import type { JobberClient, JobberVendor, JobberProperty, JobberJob, JobberVisit, JobberEntityType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { isMockJobberEnabled } from '@/hooks/useMockJobber';
import { MOCK_CLIENTS, MOCK_VENDORS, MOCK_PROPERTIES, MOCK_JOBS, MOCK_VISITS } from '@/lib/mockJobberData';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}

function SearchableSelect({ value, onChange, placeholder, options }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
  const filtered = sorted.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(''); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                    o.value === value ? 'bg-accent/50 font-medium' : ''
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface JobberEntityPickerProps {
  entityType: JobberEntityType | '';
  entityId: string;
  onTypeChange: (type: JobberEntityType | '') => void;
  onIdChange: (id: string) => void;
  onLabelChange?: (label: string) => void;
  ticketEntityType?: JobberEntityType;
  ticketEntityId?: string;
}

export function JobberEntityPicker({
  entityType,
  entityId,
  onTypeChange,
  onIdChange,
  onLabelChange,
  ticketEntityType,
  ticketEntityId,
}: JobberEntityPickerProps) {
  const useMock = isMockJobberEnabled();

  const allowedTypes: JobberEntityType[] =
    ticketEntityType === 'vendor' ? ['job', 'visit'] :
    ticketEntityType === 'client' ? ['property', 'job', 'visit'] :
    ['client', 'property', 'job', 'visit', 'vendor'];

  useEffect(() => {
    if (entityType && !allowedTypes.includes(entityType as JobberEntityType)) {
      onTypeChange('');
      onIdChange('');
      onLabelChange?.('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketEntityType]);

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

  const { data: vendors = [] } = useQuery<JobberVendor[]>({
    queryKey: ['jobber-vendors', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_VENDORS)
        : api.get<JobberVendor[]>('/api/jobber/vendors').then((r) => r.data),
    enabled: entityType === 'vendor',
  });

  const handleSelect = (id: string, label: string) => {
    onIdChange(id);
    onLabelChange?.(label);
  };

  const filteredProperties = ticketEntityId && ticketEntityType === 'client'
    ? properties.filter((p) => p.client.id === ticketEntityId)
    : properties;

  const filteredJobs = ticketEntityId
    ? ticketEntityType === 'client'
      ? jobs.filter((j) => j.client?.id === ticketEntityId)
      : ticketEntityType === 'vendor'
        ? jobs.filter((j) => j.vendor?.id === ticketEntityId)
        : jobs
    : jobs;

  const filteredVisits = ticketEntityId
    ? ticketEntityType === 'client'
      ? visits.filter((v) => v.client.id === ticketEntityId)
      : ticketEntityType === 'vendor'
        ? visits.filter((v) => v.vendor?.id === ticketEntityId)
        : visits
    : visits;

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  const propertyOptions = filteredProperties.map((p) => ({
    value: p.id,
    label: `${p.street}, ${p.city} — ${p.client.name}`,
  }));

  const jobOptions = filteredJobs.map((j) => ({
    value: j.id,
    label: `${j.title} — ${j.client?.name ?? ''}${j.property ? ` · ${j.property.street}` : ''}`,
  }));

  const visitOptions = filteredVisits.map((v) => ({
    value: v.id,
    label: `${v.scheduledStart} · ${v.title} — ${v.property.street}, ${v.property.city}`,
  }));

  const vendorOptions = vendors.map((v) => ({
    value: v.id,
    label: v.specialty ? `${v.name} — ${v.specialty}` : v.name,
  }));

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
          {allowedTypes.includes('client') && <SelectItem value="client">Client</SelectItem>}
          {allowedTypes.includes('property') && <SelectItem value="property">Property</SelectItem>}
          {allowedTypes.includes('job') && <SelectItem value="job">Job</SelectItem>}
          {allowedTypes.includes('visit') && <SelectItem value="visit">Visit</SelectItem>}
          {allowedTypes.includes('vendor') && <SelectItem value="vendor">Vendor</SelectItem>}
        </SelectContent>
      </Select>

      {entityType === 'client' && (
        <SearchableSelect
          value={entityId}
          onChange={(id) => {
            const label = clientOptions.find((o) => o.value === id)?.label ?? id;
            handleSelect(id, label);
          }}
          placeholder="Select client..."
          options={clientOptions}
        />
      )}

      {entityType === 'property' && (
        <SearchableSelect
          value={entityId}
          onChange={(id) => {
            const label = propertyOptions.find((o) => o.value === id)?.label ?? id;
            handleSelect(id, label);
          }}
          placeholder="Select property..."
          options={propertyOptions}
        />
      )}

      {entityType === 'job' && (
        <SearchableSelect
          value={entityId}
          onChange={(id) => {
            const label = jobOptions.find((o) => o.value === id)?.label ?? id;
            handleSelect(id, label);
          }}
          placeholder="Select job..."
          options={jobOptions}
        />
      )}

      {entityType === 'visit' && (
        <SearchableSelect
          value={entityId}
          onChange={(id) => {
            const label = visitOptions.find((o) => o.value === id)?.label ?? id;
            handleSelect(id, label);
          }}
          placeholder="Select visit..."
          options={visitOptions}
        />
      )}

      {entityType === 'vendor' && (
        <SearchableSelect
          value={entityId}
          onChange={(id) => {
            const label = vendorOptions.find((o) => o.value === id)?.label ?? id;
            handleSelect(id, label);
          }}
          placeholder="Select vendor..."
          options={vendorOptions}
        />
      )}
    </div>
  );
}
