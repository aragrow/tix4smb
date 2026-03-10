import fs from 'fs';
import path from 'path';

interface BusinessConfig {
  services: Record<string, string>;
  locations: string[];
}

const CONFIG_PATH = path.resolve(__dirname, 'businessConfig.json');

let _config: BusinessConfig | null = null;

export function loadBusinessConfig(): BusinessConfig {
  if (!_config) {
    try {
      _config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as BusinessConfig;
    } catch {
      console.warn('[BusinessConfig] Could not load businessConfig.json — using empty defaults');
      _config = { services: {}, locations: [] };
    }
  }
  return _config;
}
