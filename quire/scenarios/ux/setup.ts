// A folder the score tests write their states to, read by report.ux.ts, removed at the end.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default async function setup(): Promise<() => Promise<void>> {
  const out = mkdtempSync(join(tmpdir(), 'quire-ux-'));
  process.env['QUIRE_UX_OUT'] = out;
  return async () => rmSync(out, { recursive: true, force: true });
}
