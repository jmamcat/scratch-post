You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0003-production-hardening
Your packet: quire/changes/0003-production-hardening/packets/P01-access.md

Rules (full text in the playbook: core/run-protocol.md and core/decisions.md):
1. Set status: doing and claimed_by: <your harness>/<your model> in the packet front matter.
2. Edit paths matching "owns"; edit "borrows" paths only as narrowly as their reason says.
   You may read "reads" paths. Need any other path? Stop, log a decision record, and ask the
   coordinator (or set status: blocked). Never edit it and explain afterwards.
3. When something is unclear: follow the spec, then existing conventions, then the baseline
   reference, then the simplest reversible option. Log each such call as a decision record.
   Keep the structure rules (modules/structure) if the project has them on.
4. Stop only for destructive actions outside "owns", secrets/credentials/payments, or
   license problems. Then set status: blocked with the reason.
5. Done means every gate in Acceptance passes (playbook/bin/gate.sh), including the named scenarios. Paste a
   short result summary (counts, scenario tags) under Acceptance, then set status: done.
6. Never put model names in code or commit messages.

The packet follows.

---
id: 0003-production-hardening/P01
title: Access control - required tokens, named tokens, tickets, origins, headers, limits
lane: A
depends_on: [P00]
owns:
  - quire/apps/server/src/access/**
  - quire/scenarios/steps/access.steps.ts
borrows:
  - quire/packages/sync/src/http.ts  # streamParams/streamUrl fetch a ticket instead of returning the token
  - quire/apps/web/src/live/live.ts  # only if a dead ticket stops the rejoin; keep the change minimal
  - quire/apps/server/src/platforms/config.ts  # add trustProxy (QUIRE_TRUST_PROXY=1) for X-Forwarded-For
  - quire/scenarios/support/browser-device.ts  # record request URLs for R-ACC-04
  - quire/scenarios/steps/vault.steps.ts  # only the existing token steps, if they send ?token=
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/server/src/**
  - quire/apps/web/src/**
  - quire/packages/sync/src/**
  - quire/scenarios/**
size: M
revision: 1
status: todo
---

# Access control

## Context

Implements R-ACC-01, R-ACC-02, R-ACC-03, R-ACC-04, R-ACC-05 and R-ACC-06
(`quire/changes/0003-production-hardening/spec/access/spec.md`). The server is for one owner
and up to 32 people or devices; each gets a named token. P00 wired the contract: `app.ts`
calls `createAccess(config, store)`, then `access.assertConfigured()`, then
`access.install(app)` right after the request logger; `main.ts` passes
`access.authorizeUpgrade` to the live rooms and closes a revoked token's live connections
through `access.onRevoke`. The current `access/index.ts` is a stub with the old behaviour.
Replace it; keep the exported names and signatures.

## Contract

```ts
export interface Access {
  assertConfigured(): void;                 // throw new Error('no access token configured') unless QUIRE_TOKEN is set, a token row exists, or config.insecureNoAuth
  install(app: Hono): void;                 // security headers, CORS, size limits, throttle, guard - in that order
  authorizeUpgrade(url: URL, req: IncomingMessage): string | null;  // `?ticket=` only; returns the ticket's token name
  onRevoke(fn: (name: string) => void): () => void;
  stop(): void;                             // clear timers
}
export function createAccess(config: Config, store: SqliteRevisionStore): Access;
export async function tokensCli(args: string[], config: Config): Promise<number>;
```

Rules:

- **Tokens** live in the `tokens` table (schema version 2, see `vault/schema.ts`): `name`,
  `hash` (hex SHA-256 of the token), `created_at`, `last_used_at`, `revoked_at`. Compare with
  `crypto.timingSafeEqual` on equal-length hash buffers. `QUIRE_TOKEN` is always valid as the
  name `admin` and is never stored. At most `config.maxTokens` (32) tokens that are not
  revoked. Re-read the table at most every second (the CLI runs in another process); when a
  name turns revoked, call the `onRevoke` listeners.
- **CLI** (`quire tokens ...`, called from `apps/server/src/cli.ts` with the config):
  `add <name>... [--token T]` (generate 32 random bytes, base64url, when `--token` is absent;
  print `<name> <token>` per line; exit 1 with a message when over the limit or the name
  exists), `list` (name, created, last used, revoked), `revoke <name>`.
- **Guard** on `/api/*`: exempt `/api/health` and `/api/ready`. Accept only
  `Authorization: Bearer <token>`; any request with a `token` query parameter gets 401
  `{ error: 'tokens in URLs are not accepted' }`. `GET /api/events` also accepts
  `?ticket=`. After a successful check call `c.set('principal', name)` (the request logger,
  P10, reads it).
- **Tickets**: `POST /api/tickets` (needs the header token) returns
  `{ ticket, expiresAt }`; random 32 bytes base64url, in memory, valid
  `config.ticketTtlMs`, single use, remembers the token name; revoking the token voids its
  tickets.
- **HttpTransport.streamParams()** (borrowed): fetch a ticket with `request('POST',
  '/api/tickets')` and return `{ ticket }`; return `{}` when the transport has no token.
  `streamUrl` already calls it per connection. `url()` stays for callers that pass no
  credentials but must no longer add the token.
- **Live**: `authorizeUpgrade` accepts `?ticket=` only (insecure mode: any connection,
  name `anonymous`). The web client already asks for fresh params on every join
  (`live.ts`); make sure a refused reconnect with a spent ticket falls back to a new join.
- **CORS**: same origin always; plus `config.allowedOrigins`; other origins get no
  `Access-Control-Allow-Origin`. **Headers** on every response:
  `Content-Security-Policy` (at least `default-src 'self'; frame-ancestors 'none';
  object-src 'none'; base-uri 'self'`; allow what the built app needs: images from
  `blob:` and `data:`, `connect-src` for the same host over `ws:`/`wss:`, `worker-src
  'self'` for the service worker), `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`.
- **Limits**: request bodies on `/api/files` up to `config.maxFileBytes`, others up to
  `config.maxNoteBytes` plus 64 KiB of JSON overhead; and a pushed note text longer than
  `maxNoteBytes` bytes (UTF-8) is 413 even inside the limit. **Throttle**: more than 10
  failed checks from one address in a minute: 429 for that address until the minute ends.
  The address is the socket's remote address, or the first `X-Forwarded-For` entry when
  `QUIRE_TRUST_PROXY=1` (add `trustProxy: boolean` to `Config`).

Steps (`quire/scenarios/steps/access.steps.ts`; the shared ones exist in
`steps/servers.steps.ts`: `a cloud server starts with no access token`, `the cloud server
fails to start with the message`, `device "d" using the token "t"`, `devices ... using the
token`). Run CLI steps with the server's `tsx` (`support/servers.ts` shows the path) and
`QUIRE_DATA_DIR` of the cloud server. Every phrase in `quire/spec/STEPS.md`, section
"Access", that no other file defines is yours.

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P01
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@cap-access|@cap-live|@R-SYN-09|@R-VLT-0"
```

All `@cap-access` scenarios pass, and the live, local node and vault scenarios still pass.

## Decisions log

---
Coordinator notes for change 0003:
- The machine has 4 cores and other workers run scenarios at the same time. Before you call a scenario failure real, rerun that scenario alone once (playbook/bin/gate.sh scenarios "@R-XXX-NN"). Timeouts under load are not your bug unless they repeat when run alone.
- Never stop processes by name pattern (pkill, killall). Stop only processes you started, by PID.
- Builds of the web app go to your own QUIRE_WEB_DIST folder, as the Acceptance shows; never build into apps/web/dist while others run.
- Do not add npm dependencies or edit package.json files; if you need one, stop and log a decision record. Do not commit to git.
- Other packets in this wave: P01 access, P02 change sets, P05 rename, P06 files, P10 ops. Their files are theirs.
