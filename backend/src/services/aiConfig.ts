import fs from 'fs';
import path from 'path';

export type AIProvider = 'anthropic' | 'openai' | 'google';

export interface AIConfig {
  provider: AIProvider;
  model: string;
}

export const PROVIDER_MODELS: Record<AIProvider, Array<{ id: string; label: string }>> = {
  anthropic: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' },
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (Balanced)' },
    { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6 (Most capable)' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & cheap)' },
    { id: 'gpt-4o',      label: 'GPT-4o (Most capable)' },
  ],
  google: [
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Fastest & cheapest)' },
    { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash (Balanced)' },
    { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro (Most capable)' },
    { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (Legacy)' },
  ],
};

const DEFAULT: AIConfig = { provider: 'anthropic', model: 'claude-haiku-4-5-20251001' };
const CONFIG_FILE = path.resolve(process.cwd(), 'ai-config.json');

export function loadAIConfig(): AIConfig {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as AIConfig;
    } catch {
      // fall through to default
    }
  }
  return { ...DEFAULT };
}

export function saveAIConfig(config: AIConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
