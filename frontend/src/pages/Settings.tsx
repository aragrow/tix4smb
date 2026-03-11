import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, RefreshCw, Plug, FlaskConical, Bot, TestTube2, Send } from 'lucide-react';
import { useMockJobber } from '@/hooks/useMockJobber';
import { useMockGHL } from '@/hooks/useMockGHL';

interface JobberStatus {
  connected: boolean;
}

interface GHLStatus {
  connected: boolean;
  location_id?: string;
}

interface GHLDNDSettings {
  Call?:     { status: string };
  Email?:    { status: string };
  SMS?:      { status: string };
  WhatsApp?: { status: string };
  GMB?:      { status: string };
  FB?:       { status: string };
}

interface GHLTestContact {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  classification?: string;
  communicationPreference?: string;
  dnd?: boolean;
  dndSettings?: GHLDNDSettings;
}

function isDND(c: GHLTestContact, channel: keyof GHLDNDSettings): boolean {
  return c.dnd === true || c.dndSettings?.[channel]?.status === 'active';
}

interface GHLTestResult {
  contacts: GHLTestContact[];
  classification: string;
  serviceTag: string;
  locationTag: string;
  mock: boolean;
  total: number;
}

type AIProvider = 'anthropic' | 'openai' | 'google';
interface AISettings {
  provider: AIProvider;
  model: string;
  rfp_message_grouping: 'individual' | 'combined';
  providers: Record<AIProvider, Array<{ id: string; label: string }>>;
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get('jobber') === 'connected';
  const connectionError = searchParams.get('error');
  const { enabled: mockEnabled, toggle: toggleMock } = useMockJobber();
  const { enabled: mockGHLEnabled, toggle: toggleMockGHL } = useMockGHL();
  const queryClient = useQueryClient();

  // GHL form state
  const [ghlApiKey, setGhlApiKey] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [showGhlForm, setShowGhlForm] = useState(false);
  const [ghlTestOpen, setGhlTestOpen] = useState(false);
  const [jobberTestOpen, setJobberTestOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyType, setNotifyType] = useState<'SMS' | 'Email'>('SMS');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySubject, setNotifySubject] = useState('Test Message from TIX4SMB');

  const { data: jobberStatus, refetch } = useQuery<JobberStatus>({
    queryKey: ['jobber-status'],
    queryFn: () => api.get<JobberStatus>('/api/jobber/status').then((r) => r.data),
  });

  const { data: ghlStatus, refetch: refetchGHL } = useQuery<GHLStatus>({
    queryKey: ['ghl-status'],
    queryFn: () => api.get<GHLStatus>('/api/ghl/status').then((r) => r.data),
  });

  const { data: ghlTestResult, isFetching: ghlTestFetching } = useQuery<GHLTestResult>({
    queryKey: ['ghl-test-query'],
    queryFn: () => api.get<GHLTestResult>('/api/ghl/contacts/test-query').then((r) => r.data),
    enabled: ghlTestOpen,
    staleTime: 0,
  });

  interface JobberTestResult {
    mock: boolean;
    entities: Array<{ type: string; data: Record<string, unknown> | null }>;
  }

  const { data: jobberTestResult, isFetching: jobberTestFetching } = useQuery<JobberTestResult>({
    queryKey: ['jobber-test-query'],
    queryFn: () => api.get<JobberTestResult>('/api/jobber/test-query').then((r) => r.data),
    enabled: jobberTestOpen,
    staleTime: 0,
  });

  const { data: aiSettings, refetch: refetchAI } = useQuery<AISettings>({
    queryKey: ['ai-settings'],
    queryFn: () => api.get<AISettings>('/api/settings/ai').then((r) => r.data),
  });

  const sync = useMutation({
    mutationFn: () => api.post('/api/jobber/sync'),
    onSuccess: () => void refetch(),
  });

  const saveAI = useMutation({
    mutationFn: (patch: { provider?: AIProvider; model?: string; rfp_message_grouping?: 'individual' | 'combined' }) =>
      api.post('/api/settings/ai', { ...aiSettings, ...patch }).then((r) => r.data),
    onSuccess: () => void refetchAI(),
  });

  const saveGHL = useMutation({
    mutationFn: (payload: { api_key: string; location_id: string }) =>
      api.post('/api/settings/ghl', payload).then((r) => r.data),
    onSuccess: () => {
      void refetchGHL();
      void queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['ghl-opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['ghl-appointments'] });
      setShowGhlForm(false);
      setGhlApiKey('');
      setGhlLocationId('');
    },
  });

  const disconnectGHL = useMutation({
    mutationFn: () => api.delete('/api/settings/ghl').then((r) => r.data),
    onSuccess: () => void refetchGHL(),
  });

  const sendNotify = useMutation({
    mutationFn: () =>
      api.post('/api/ghl/test-notify', {
        type: notifyType,
        message: notifyMessage,
        subject: notifySubject,
      }).then((r) => r.data),
    onSuccess: () => {
      setNotifyMessage('');
    },
  });

  const handleConnectJobber = () => {
    window.location.href = `${import.meta.env.VITE_API_URL as string}/auth/jobber`;
  };

  const isJobberConnected = jobberStatus?.connected ?? false;
  const isGHLConnected = ghlStatus?.connected ?? false;
  const currentModels = aiSettings ? aiSettings.providers[aiSettings.provider] ?? [] : [];

  return (
    <div className="p-4 md:p-8 w-full max-w-8xl space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {justConnected && (
        <div className="rounded-md bg-green-900/30 border border-green-800 px-4 py-3 text-sm text-green-300">
          Jobber connected successfully!
        </div>
      )}
      {connectionError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive-foreground">
          Connection failed: {connectionError.replace(/_/g, ' ')}
        </div>
      )}

      {/* Mock data toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Developer / Testing
          </CardTitle>
          <CardDescription>
            Use sample data instead of live Jobber data so you can test without a connected account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary cursor-pointer"
              checked={mockEnabled}
              onChange={(e) => toggleMock(e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium">Use mock Jobber data</p>
              <p className="text-xs text-muted-foreground">
                Populates client &amp; job pickers with sample cleaning-services records.
              </p>
            </div>
            {mockEnabled && (
              <span className="ml-auto text-xs font-medium text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded-full">
                Mock active
              </span>
            )}
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary cursor-pointer"
              checked={mockGHLEnabled}
              onChange={(e) => {
                toggleMockGHL(e.target.checked);
                void queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
                void queryClient.invalidateQueries({ queryKey: ['ghl-opportunities'] });
                void queryClient.invalidateQueries({ queryKey: ['ghl-appointments'] });
              }}
            />
            <div>
              <p className="text-sm font-medium">Use mock GoHighLevel data</p>
              <p className="text-xs text-muted-foreground">
                Populates contact, opportunity, and appointment pickers with sample records.
              </p>
            </div>
            {mockGHLEnabled && (
              <span className="ml-auto text-xs font-medium text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded-full">
                Mock active
              </span>
            )}
          </label>
        </CardContent>
      </Card>

      {/* AI Agent settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Agent
          </CardTitle>
          <CardDescription>
            When a ticket is created the agent analyzes it and adds contextual notes from Jobber data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiSettings ? (
            <>
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Provider</p>
                <Select
                  value={aiSettings.provider}
                  onValueChange={(v) => {
                    const provider = v as AIProvider;
                    const firstModel = aiSettings.providers[provider]?.[0]?.id ?? '';
                    saveAI.mutate({ provider, model: firstModel });
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="google">Google (Gemini)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Model</p>
                <Select
                  value={aiSettings.model}
                  onValueChange={(v) => saveAI.mutate({ model: v })}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">RFP Message Grouping</p>
                <Select
                  value={aiSettings.rfp_message_grouping ?? 'individual'}
                  onValueChange={(v) => saveAI.mutate({ rfp_message_grouping: v as 'individual' | 'combined' })}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual — one message per job per vendor</SelectItem>
                    <SelectItem value="combined">Combined — one message per vendor with all jobs</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls how RFP messages are sent when a vendor covers multiple tasks.
                </p>
              </div>

              {saveAI.isPending && (
                <p className="text-xs text-muted-foreground">Saving...</p>
              )}
              {saveAI.isSuccess && !saveAI.isPending && (
                <p className="text-xs text-green-400">Saved.</p>
              )}

              <p className="text-xs text-muted-foreground pt-1 border-t">
                Add your API key to <code className="font-mono">backend/.env.local</code>:&nbsp;
                {aiSettings.provider === 'anthropic' && 'ANTHROPIC_API_KEY'}
                {aiSettings.provider === 'openai' && 'OPENAI_API_KEY'}
                {aiSettings.provider === 'google' && 'GOOGLE_API_KEY'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>

      {/* Jobber Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Jobber Integration
          </CardTitle>
          <CardDescription>
            Connect your Jobber account to link tickets to clients, jobs, and properties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {isJobberConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Not connected</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {!isJobberConnected ? (
              <Button onClick={handleConnectJobber}>
                Connect Jobber
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => sync.mutate()}
                  disabled={sync.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${sync.isPending ? 'animate-spin' : ''}`} />
                  {sync.isPending ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button variant="outline" onClick={handleConnectJobber}>
                  Reconnect
                </Button>
                <Button variant="outline" className="gap-1.5" disabled title="Coming soon">
                  <Send className="h-4 w-4" />
                  Notify Test Client
                </Button>
              </>
            )}
            {(isJobberConnected || mockEnabled) && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => setJobberTestOpen(true)}
              >
                <TestTube2 className="h-4 w-4" />
                Test Entity Query
              </Button>
            )}
          </div>

          {isJobberConnected && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>Tokens are stored in <code className="font-mono">backend/.jobber-tokens.json</code></p>
              <p>Tokens refresh automatically when they expire.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GoHighLevel Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            GoHighLevel Integration
          </CardTitle>
          <CardDescription>
            Connect GoHighLevel to link tickets to contacts, opportunities, and appointments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {isGHLConnected ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Connected</span>
                {ghlStatus?.location_id && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (Location: <code className="font-mono">{ghlStatus.location_id}</code>)
                  </span>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Not connected</span>
              </>
            )}
          </div>

          {!showGhlForm && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant={isGHLConnected ? 'outline' : 'default'}
                onClick={() => setShowGhlForm(true)}
              >
                {isGHLConnected ? 'Update Credentials' : 'Connect GoHighLevel'}
              </Button>
              {isGHLConnected && (
                <>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setGhlTestOpen(true)}
                  >
                    <TestTube2 className="h-4 w-4" />
                    Test Contact Query
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setNotifyOpen(true)}
                  >
                    <Send className="h-4 w-4" />
                    Notify Test Vendor
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => disconnectGHL.mutate()}
                    disabled={disconnectGHL.isPending}
                  >
                    {disconnectGHL.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </>
              )}
            </div>
          )}

          {showGhlForm && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">API Key</label>
                <input
                  type="password"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
                  value={ghlApiKey}
                  onChange={(e) => setGhlApiKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1..."
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Found in GHL → Settings → Integrations → API Keys
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Location ID</label>
                <input
                  type="text"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
                  value={ghlLocationId}
                  onChange={(e) => setGhlLocationId(e.target.value)}
                  placeholder="abc123xyz..."
                />
                <p className="text-xs text-muted-foreground">
                  Found in GHL → Settings → Business Profile → Location ID
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => saveGHL.mutate({ api_key: ghlApiKey, location_id: ghlLocationId })}
                  disabled={!ghlApiKey.trim() || !ghlLocationId.trim() || saveGHL.isPending}
                >
                  {saveGHL.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowGhlForm(false); setGhlApiKey(''); setGhlLocationId(''); }}
                >
                  Cancel
                </Button>
              </div>
              {saveGHL.isError && (
                <p className="text-xs text-destructive">Failed to save. Check your credentials.</p>
              )}
            </div>
          )}

          {!isGHLConnected && !showGhlForm && (
            <p className="text-xs text-muted-foreground">
              Mock GHL data is used when not connected. Contacts, opportunities, and appointments
              will pull from sample cleaning-service records.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notify Test Vendor Modal */}
      {notifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Notify Test Vendor
              </h3>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                onClick={() => { setNotifyOpen(false); sendNotify.reset(); }}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Sending to: <span className="text-foreground font-medium">David Aragov</span>
                <span className="font-mono ml-1 opacity-60">(T8Bf5irLuFExhsihKB2j)</span>
              </p>

              {/* Type selector */}
              <div className="flex gap-3">
                {(['SMS', 'Email'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <input
                      type="radio"
                      name="notifyType"
                      value={t}
                      checked={notifyType === t}
                      onChange={() => setNotifyType(t)}
                      className="accent-primary"
                    />
                    {t}
                  </label>
                ))}
              </div>

              {/* Subject (email only) */}
              {notifyType === 'Email' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
                    value={notifySubject}
                    onChange={(e) => setNotifySubject(e.target.value)}
                  />
                </div>
              )}

              {/* Message */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  rows={4}
                  placeholder={notifyType === 'SMS' ? 'Enter SMS message...' : 'Enter email body...'}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                />
              </div>

              {sendNotify.isSuccess && (
                <p className="text-xs text-green-400">
                  {notifyType} sent successfully.
                </p>
              )}
              {sendNotify.isError && (
                <p className="text-xs text-destructive break-words">
                  {(sendNotify.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                    ?? 'Send failed — check backend console for details.'}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setNotifyOpen(false); sendNotify.reset(); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!notifyMessage.trim() || sendNotify.isPending}
                onClick={() => sendNotify.mutate()}
              >
                <Send className="h-3.5 w-3.5" />
                {sendNotify.isPending ? 'Sending...' : `Send ${notifyType}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Jobber Test Entity Query Modal */}
      {jobberTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <TestTube2 className="h-4 w-4 text-primary" />
                  Jobber Entity Query Test
                </h3>
                {jobberTestResult && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    1 record per entity type
                    {jobberTestResult.mock && <span className="ml-2 text-warning">(mock data)</span>}
                  </p>
                )}
              </div>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                onClick={() => setJobberTestOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {jobberTestFetching ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Querying Jobber...</p>
              ) : jobberTestResult ? (
                <div className="space-y-3">
                  {jobberTestResult.entities.map(({ type, data }) => (
                    <div key={type}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        {type}
                      </p>
                      {data ? (
                        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
                          {Object.entries(data)
                            .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
                            .map(([k, v]) => (
                              <div key={k} className="flex gap-2 text-xs">
                                <span className="text-muted-foreground w-28 shrink-0 capitalize">{k.replace(/_/g, ' ')}</span>
                                <span className="text-foreground">{String(v)}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No data</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setJobberTestOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GHL Test Query Modal */}
      {ghlTestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <TestTube2 className="h-4 w-4 text-primary" />
                  GHL Contact Query Test
                </h3>
                {ghlTestResult && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Classification: <span className="text-foreground font-medium">{ghlTestResult.classification}</span>
                    {' · '}Service: <span className="text-foreground font-medium">{ghlTestResult.serviceTag}</span>
                    {' · '}Location: <span className="text-foreground font-medium">{ghlTestResult.locationTag}</span>
                    {ghlTestResult.mock && <span className="ml-2 text-warning">(mock)</span>}
                  </p>
                )}
              </div>
              <button
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                onClick={() => setGhlTestOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {ghlTestFetching ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Querying GoHighLevel...</p>
              ) : ghlTestResult ? (
                ghlTestResult.contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No contacts found matching these filters.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">
                      {ghlTestResult.total} contact{ghlTestResult.total !== 1 ? 's' : ''} matched
                    </p>
                    {ghlTestResult.contacts.map((c) => {
                      const name = c.name ?? [c.firstName, c.lastName].filter(Boolean).join(' ') ?? c.id;
                      return (
                        <div key={c.id} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{name}</p>
                            {c.communicationPreference && (
                              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize
                                bg-sky-500/10 text-sky-400 border-sky-500/30">
                                {c.communicationPreference}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            {c.email && !isDND(c, 'Email') && <span>{c.email}</span>}
                            {c.phone && !isDND(c, 'Call') && !isDND(c, 'SMS') && <span>{c.phone}</span>}
                          </div>
                          {c.tags && c.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {c.tags.map((t) => (
                                <span key={t} className="bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : null}
            </div>

            <div className="px-6 py-4 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setGhlTestOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>OAuth Setup</CardTitle>
          <CardDescription>Required redirect URIs for OAuth configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Google OAuth — Authorized redirect URI</p>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
              {import.meta.env.VITE_API_URL as string}/auth/google/callback
            </code>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Jobber OAuth — Redirect URI</p>
            <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
              {import.meta.env.VITE_API_URL as string}/auth/jobber/callback
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
