import { useQuery, useMutation } from '@tanstack/react-query';
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

  const { data: jobberStatus, refetch } = useQuery<JobberStatus>({
    queryKey: ['jobber-status'],
    queryFn: () => api.get<JobberStatus>('/api/jobber/status').then((r) => r.data),
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

  const handleConnectJobber = () => {
    window.location.href = `${import.meta.env.VITE_API_URL as string}/auth/jobber`;
  };

  const isConnected = jobberStatus?.connected ?? false;
  const currentModels = aiSettings ? aiSettings.providers[aiSettings.provider] ?? [] : [];

  return (
    <div className="p-8 max-w-2xl space-y-6">
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
            {isConnected ? (
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
            {!isConnected ? (
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

          {isConnected && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>Tokens are stored in <code className="font-mono">backend/.jobber-tokens.json</code></p>
              <p>Tokens refresh automatically when they expire.</p>
            </div>
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
