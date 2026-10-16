// Starts one cloud server on a copy of the demo seed for every scoring worker, and stops it at the end.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ServerProcess } from '../support/servers.ts';
import { DEMO_SEED } from './quire.ts';

export default async function setup(): Promise<() => Promise<void>> {
  const cloud = new ServerProcess({ device: 'cloud' });
  cpSync(DEMO_SEED, cloud.vaultDir, { recursive: true });
  await cloud.start();
  const out = mkdtempSync(join(tmpdir(), 'quire-ux-'));
  process.env['QUIRE_UX_URL'] = cloud.url;
  process.env['QUIRE_UX_OUT'] = out;
  return async () => {
    await cloud.stop();
    rmSync(cloud.dataDir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  };
}
