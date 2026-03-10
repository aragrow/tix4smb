import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import type { GHLContact, GHLOpportunity, GHLAppointment, GHLEntityType } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOCK_GHL_CONTACTS, MOCK_GHL_OPPORTUNITIES, MOCK_GHL_APPOINTMENTS } from '@/lib/mockGHLData';
import { isMockGHLEnabled } from '@/hooks/useMockGHL';

interface GHLEntityPickerProps {
  entityType: GHLEntityType | '';
  entityId: string;
  onTypeChange: (type: GHLEntityType | '') => void;
  onIdChange: (id: string) => void;
  onLabelChange?: (label: string) => void;
}

export function GHLEntityPicker({
  entityType,
  entityId,
  onTypeChange,
  onIdChange,
  onLabelChange,
}: GHLEntityPickerProps) {
  const { data: ghlStatus } = useQuery<{ connected: boolean }>({
    queryKey: ['ghl-status'],
    queryFn: () => api.get<{ connected: boolean }>('/api/ghl/status').then((r) => r.data),
    staleTime: 30_000,
  });
  const useMock = isMockGHLEnabled() || !ghlStatus?.connected;

  const { data: contacts = [] } = useQuery<GHLContact[]>({
    queryKey: ['ghl-contacts', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_GHL_CONTACTS)
        : api.get<GHLContact[]>('/api/ghl/contacts').then((r) => r.data),
    enabled: entityType === 'contact',
  });

  const { data: opportunities = [] } = useQuery<GHLOpportunity[]>({
    queryKey: ['ghl-opportunities', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_GHL_OPPORTUNITIES)
        : api.get<GHLOpportunity[]>('/api/ghl/opportunities').then((r) => r.data),
    enabled: entityType === 'opportunity',
  });

  const { data: appointments = [] } = useQuery<GHLAppointment[]>({
    queryKey: ['ghl-appointments', useMock],
    queryFn: () =>
      useMock
        ? Promise.resolve(MOCK_GHL_APPOINTMENTS)
        : api.get<GHLAppointment[]>('/api/ghl/appointments').then((r) => r.data),
    enabled: entityType === 'appointment',
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
          onTypeChange(v === '__none__' ? '' : (v as GHLEntityType));
          onIdChange('');
          onLabelChange?.('');
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Entity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          <SelectItem value="contact">Contact</SelectItem>
          <SelectItem value="opportunity">Opportunity</SelectItem>
          <SelectItem value="appointment">Appointment</SelectItem>
        </SelectContent>
      </Select>

      {entityType === 'contact' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const c = contacts.find((x) => x.id === id);
            handleIdChange(id, c?.name ?? id);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select contact..." />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entityType === 'opportunity' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const o = opportunities.find((x) => x.id === id);
            const label = o
              ? `${o.name}${o.contact ? ` — ${o.contact.name}` : ''}${o.pipelineStage ? ` (${o.pipelineStage})` : ''}`
              : id;
            handleIdChange(id, o?.name ?? label);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select opportunity..." />
          </SelectTrigger>
          <SelectContent>
            {opportunities.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}{o.pipelineStage ? ` — ${o.pipelineStage}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {entityType === 'appointment' && (
        <Select
          value={entityId}
          onValueChange={(id) => {
            const a = appointments.find((x) => x.id === id);
            const label = a
              ? `${a.startTime} · ${a.title}${a.address ? ` — ${a.address}` : ''}`
              : id;
            handleIdChange(id, label);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select appointment..." />
          </SelectTrigger>
          <SelectContent>
            {appointments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.startTime} · {a.title}{a.address ? ` — ${a.address}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
