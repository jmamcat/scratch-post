import { pathToFileURL } from 'node:url';
import { tokensCli } from './access/index.ts';
import { backupCli, compactCli, restoreCli } from './backup/index.ts';
import { loadConfig } from './platforms/index.ts';

const USAGE = `quire <command>

  serve                                  run the server (the default)
  tokens add <name> [--token T]          add an access token (printed once when generated)
  tokens list | tokens revoke <name>
  backup now | backup verify | backup list
  restore <backup-dir> --to <data-dir> [--at <rev>]
  compact                                compact history now

Settings come from the environment (QUIRE_DATA_DIR, QUIRE_BACKUP_DIR, ...); --data-dir overrides
QUIRE_DATA_DIR for every command.`;

/** `quire` command line (R-ACC-02, R-BAK-04..06). Every command reads the same environment as the server. */
export async function main(argv: string[]): Promise<number> {
  const args = [...argv];
  const at = args.indexOf('--data-dir');
  if (at >= 0) {
    process.env.QUIRE_DATA_DIR = args[at + 1];
    args.splice(at, 2);
  }
  const [cmd = 'serve', ...rest] = args;
  if (cmd === 'serve') {
    await import('./main.ts').then((m) => m.runServer());
    return -1;
  }
  const config = loadConfig({ ...process.env, QUIRE_INSECURE_NO_AUTH: '1' });
  switch (cmd) {
    case 'tokens':
      return tokensCli(rest, config);
    case 'backup':
      return backupCli(rest, config);
    case 'restore':
      return restoreCli(rest, config);
    case 'compact':
      return compactCli(rest, config);
    default:
      console.error(USAGE);
      return cmd === 'help' || cmd === '--help' ? 0 : 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const code = await main(process.argv.slice(2));
  if (code >= 0) process.exit(code);
}
