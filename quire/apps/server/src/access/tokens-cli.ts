import { join } from 'node:path';
import type { Config } from '../platforms/index.ts';
import { SqliteRevisionStore } from '../vault/index.ts';
import { newSecret, tokenAdmin } from './tokens.ts';

const USAGE = `quire tokens add <name>... [--token T]   add tokens (generated ones are printed once)
quire tokens list                        name, created, last used, revoked
quire tokens revoke <name>               stop a token at once; its live connections close`;

/**
 * Opens the server's database from this process. A fresh data folder is set up here, so tokens
 * can exist before the first start; an older schema is left to the server, which backs up
 * before it migrates.
 */
function open(config: Config): SqliteRevisionStore {
  const store = new SqliteRevisionStore(join(config.dataDir, 'quire.db'), {
    beforeMigrate: () => {
      throw new Error('this data folder uses an older schema: start the server once to upgrade it, then add tokens');
    },
  });
  store.db.exec('PRAGMA busy_timeout = 5000');
  return store;
}

function add(store: SqliteRevisionStore, args: string[], config: Config): number {
  const at = args.indexOf('--token');
  const given = at >= 0 ? args[at + 1] : undefined;
  if (at >= 0 && !given) throw new Error('--token needs a value');
  const names = args.filter((_, i) => at < 0 || (i !== at && i !== at + 1));
  if (!names.length) throw new Error('name the token: quire tokens add <name>');
  if (given && names.length > 1) throw new Error('--token sets one token: add one name at a time');
  // All or nothing, so a refused name never leaves half of a batch behind.
  const lines: string[] = [];
  store.db.exec('BEGIN IMMEDIATE');
  try {
    for (const name of names) {
      const token = given ?? newSecret();
      tokenAdmin.add(store.db, name, token, config.maxTokens);
      lines.push(`${name} ${token}`);
    }
    store.db.exec('COMMIT');
  } catch (e) {
    store.db.exec('ROLLBACK');
    throw e;
  }
  for (const line of lines) console.log(line);
  return 0;
}

function list(store: SqliteRevisionStore): number {
  const rows = tokenAdmin.list(store.db);
  if (!rows.length) {
    console.log('no tokens (QUIRE_TOKEN, if set, works as "admin")');
    return 0;
  }
  const table = [['name', 'created', 'last used', 'revoked'], ...rows.map((r) => [r.name, r.created_at, r.last_used_at ?? '-', r.revoked_at ?? '-'])];
  const widths = table[0]!.map((_, i) => Math.max(...table.map((row) => row[i]!.length)));
  for (const row of table) console.log(row.map((cell, i) => cell.padEnd(widths[i]!)).join('  ').trimEnd());
  return 0;
}

/** `quire tokens add <name>... [--token T] | list | revoke <name>`; returns the exit code. */
export async function tokensCli(args: string[], config: Config): Promise<number> {
  const [cmd, ...rest] = args;
  if (cmd !== 'add' && cmd !== 'list' && cmd !== 'revoke') {
    console.error(USAGE);
    return 2;
  }
  let store: SqliteRevisionStore | null = null;
  try {
    store = open(config);
    if (cmd === 'add') return add(store, rest, config);
    if (cmd === 'list') return list(store);
    if (rest.length !== 1) throw new Error('name one token: quire tokens revoke <name>');
    tokenAdmin.revoke(store.db, rest[0]!);
    console.log(`revoked ${rest[0]}`);
    return 0;
  } catch (e) {
    console.error(`quire tokens: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  } finally {
    store?.close();
  }
}
