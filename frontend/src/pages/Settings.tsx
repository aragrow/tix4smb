import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, RefreshCw, Plug, FlaskConical, Bot } from 'lucide-react';
import { useMockJobber } from '@/hooks/useMockJobber';

interface JobberStatus {
  connected: boolean;
}

interface GHLStatus {
  connected: boolean;
  location_id?: string;
}

type AIProvider = 'anthropic' | 'openai' | 'google';
interface AISettings {
  provider: AIProvider;
  model: string;
  providers: Record<AIProvider, Array<{ id: string; label: string }>>;
}

export default function Settings() {
  const [searchParams] = useSearchParams();
  const justConnected = searchParams.get('jobber') === 'connected';
  const connectionError = searchParams.get('error');
  const { enabled: mockEnabled, toggle: toggleMock } = useMockJobber();
  const queryClient = useQueryClient();

  // GHL form state
  const [ghlApiKey, setGhlApiKey] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [showGhlForm, setShowGhlForm] = useState(false);

  const { data: jobberStatus, refetch } = useQuery<JobberStatus>({
    queryKey: ['jobber-status'],
    queryFn: () => api.get<JobberStatus>('/api/jobber/status').then((r) => r.data),
  });

  const { data: ghlStatus, refetch: refetchGHL } = useQuery<GHLStatus>({
    queryKey: ['ghl-status'],
    queryFn: () => api.get<GHLStatus>('/api/ghl/status').then((r) => r.data),
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
    mutationFn: (patch: { provider?: AIProvider; model?: string }) =>
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
        <CardContent>
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

          <div className="flex gap-3">
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
              </>
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
            <div className="flex gap-3">
              <Button
                variant={isGHLConnected ? 'outline' : 'default'}
                onClick={() => setShowGhlForm(true)}
              >
                {isGHLConnected ? 'Update Credentials' : 'Connect GoHighLevel'}
              </Button>
              {isGHLConnected && (
                <Button
                  variant="outline"
                  className="text-destructive-foreground hover:bg-destructive/20"
                  onClick={() => disconnectGHL.mutate()}
                  disabled={disconnectGHL.isPending}
                >
                  Disconnect
                </Button>
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
