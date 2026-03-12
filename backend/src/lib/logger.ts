import fs from 'fs';
import path from 'path';

const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logFile(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(logsDir, `app-${date}.log`);
}

function serialize(a: unknown): string {
  if (a instanceof Error) return `${a.message}${a.stack ? `\n${a.stack}` : ''}`;
  if (typeof a === 'object' && a !== null) return JSON.stringify(a);
  return String(a);
}

function write(level: string, args: unknown[]): void {
  const ts = new Date().toISOString();
  const msg = args.map(serialize).join(' ');
  const line = `${ts} [${level.padEnd(5)}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(logFile(), line);
}

export const logger = {
  info:  (...args: unknown[]) => write('INFO',  args),
  warn:  (...args: unknown[]) => write('WARN',  args),
  error: (...args: unknown[]) => write('ERROR', args),
  debug: (...args: unknown[]) => write('DEBUG', args),
};
