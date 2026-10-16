import type { LogLevel, Logger } from './types.ts';

const RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
/** Fields the logger owns; caller fields with these names are dropped rather than overwriting them. */
const RESERVED = new Set(['time', 'level', 'msg']);

/** One JSON object per line. Callers pass only the fields they name: never headers, bodies or note text (R-OPS-02). */
export function createLogger(minLevel: LogLevel, write: (line: string) => void = writeStdout): Logger {
  const emit = (level: LogLevel, msg: string, fields?: Record<string, unknown>) => {
    if (RANK[level] < RANK[minLevel]) return;
    write(lineFor(level, msg, fields));
  };
  return {
    debug: (msg, fields) => emit('debug', msg, fields),
    info: (msg, fields) => emit('info', msg, fields),
    warn: (msg, fields) => emit('warn', msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
  };
}

export function lineFor(level: LogLevel, msg: string, fields: Record<string, unknown> = {}): string {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) if (!RESERVED.has(key)) extra[key] = value;
  return JSON.stringify({ time: new Date().toISOString(), level, msg, ...extra }, (_key, value: unknown) =>
    value instanceof Error ? value.message : value,
  );
}

function writeStdout(line: string): void {
  process.stdout.write(`${line}\n`);
}
