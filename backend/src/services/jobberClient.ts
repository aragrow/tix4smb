import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

interface JobberTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix ms
}

const TOKEN_FILE = path.resolve(process.cwd(), '.jobber-tokens.json');
const JOBBER_TOKEN_URL = 'https://api.getjobber.com/api/oauth/token';
const JOBBER_GRAPHQL_URL = 'https://api.getjobber.com/api/graphql';
const JOBBER_API_VERSION = '2025-04-16';

let tokens: JobberTokens | null = null;

export function loadTokens(): void {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')) as JobberTokens;
      console.log('✅ Jobber tokens loaded from file');
    } catch {
      console.warn('⚠️  Failed to parse .jobber-tokens.json');
    }
  }
}

export function saveTokens(t: JobberTokens): void {
  tokens = t;
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(t, null, 2));
  console.log('✅ Jobber tokens saved');
}

export function hasTokens(): boolean {
  return tokens !== null && Boolean(tokens.access_token);
}

export function getTokensForEnv(): Pick<JobberTokens, 'access_token' | 'refresh_token'> | null {
  if (!tokens) return null;
  return { access_token: tokens.access_token, refresh_token: tokens.refresh_token };
}

async function refreshAccessToken(): Promise<void> {
  if (!tokens?.refresh_token) throw new Error('No refresh token available');

  const res = await fetch(JOBBER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.JOBBER_CLIENT_ID,
      client_secret: env.JOBBER_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to refresh Jobber token: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  });
}

export async function jobberGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!tokens) throw new Error('Jobber not connected. Visit /auth/jobber to connect.');

  if (tokens.expires_at && Date.now() > tokens.expires_at) {
    await refreshAccessToken();
  }

  const doRequest = async (isRetry = false): Promise<T> => {
    const res = await fetch(JOBBER_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens!.access_token}`,
        'Content-Type': 'application/json',
        'X-JOBBER-GRAPHQL-VERSION': JOBBER_API_VERSION,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 401 && !isRetry) {
      await refreshAccessToken();
      return doRequest(true);
    }

    if (!res.ok) throw new Error(`Jobber API error: ${res.status} ${await res.text()}`);

    const json = (await res.json()) as { data: T; errors?: unknown[] };
    if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
    return json.data;
  };

  return doRequest();
}
