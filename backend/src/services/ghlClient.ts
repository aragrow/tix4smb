import fs from 'fs';
import path from 'path';

interface GHLConfig {
  api_key: string;
  location_id: string;
}

const CONFIG_FILE = path.resolve(process.cwd(), '.ghl-config.json');
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-07-28';

let config: GHLConfig | null = null;

export function loadGHLConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as GHLConfig;
      if (config.api_key && config.location_id) {
        console.log('✅ GHL config loaded from file');
      } else {
        config = null;
      }
    } catch {
      console.warn('⚠️  Failed to parse .ghl-config.json');
    }
  }
}

export function saveGHLConfig(c: GHLConfig): void {
  config = c;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2));
  console.log('✅ GHL config saved');
}

export function clearGHLConfig(): void {
  config = null;
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
  console.log('🗑  GHL config cleared');
}

export function hasGHLConfig(): boolean {
  return config !== null && Boolean(config.api_key) && Boolean(config.location_id);
}

export function getGHLConfig(): GHLConfig | null {
  return config;
}

export async function ghlREST<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  if (!config) throw new Error('GHL not configured. Add API key and Location ID in Settings.');

  const url = `${GHL_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      Version: GHL_API_VERSION,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL API error: ${res.status} ${text}`);
  }

  return res.json() as Promise<T>;
}
