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
status: done
claimed_by: claude-code/tier-A
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

Result (2026-10-16, worker claude-code/tier-A):

- `gate.sh check`: typecheck clean, no dependency violations, structure 0 violations (6 old warnings).
- `@cap-access`: 12 of 13 pass. `@R-ACC-04` fails at the step `"pixel" types "!" at the end of "a.md"`
  ("is not a system-level device"): that step lives in `scenarios/steps/live.steps.ts`, outside
  this packet (D-P01-12). The flow itself was checked in Chromium outside the suite.
- `@cap-live|@R-SYN-09|@R-VLT-0`: 21 of 21 pass.
- Also run: `@R-PLT-03|@R-OPS-02|@cap-sync|@cap-review`: 25 of 25 pass.

Blocked on: borrowing `quire/scenarios/steps/live.steps.ts` for the change in D-P01-12.

**Unblocked by the coordinator (2026-10-16).** The step `"d" types "t" at the end of "p"`
(`steps/live.steps.ts`, P00's) only drove system devices; it now types into the browser
editor on `@ui` scenarios. `gate.sh scenarios "@R-ACC-04|@R-LIV-01|@R-LIV-02"`: 3 passed.
All 13 `@cap-access` scenarios pass.

## Decisions log

- **D-P01-1** · confidence: med
  - Question: "Re-read the table at most every second" lets a revoked token work for up to a second, but R-ACC-02 says it stops working "at once" and the scenario requests right after `quire tokens revoke` returns.
  - Did: the cache is re-read whenever `PRAGMA data_version` says another connection committed (one cheap pragma per check), plus a 1 s timer that does the same check and fires `onRevoke` for names that turned revoked.
  - Why: the spec line wins over the packet's cadence; the pragma keeps the cost of a re-read to "only when the CLI wrote".
  - Reverse: `TokenTable.refresh` in `apps/server/src/access/tokens.ts`; call it from the timer only.
- **D-P01-2** · confidence: med
  - Question: what is a "failed token check" for the throttle?
  - Did: only a request that presents a credential (Bearer token or ticket, also on live upgrades) that fails. Requests with no credential and `?token=` refusals are not counted. A blocked address gets 429 on every `/api/*` route except health and ready, and its live upgrades are refused (401).
  - Why: a client with no token set (fresh app install) should not lock its own address out before the person types the token; guessing needs a credential.
  - Reverse: `guard` in `access/index.ts` (the `failures.fail` line).
- **D-P01-3** · confidence: med
  - Question: what does `QUIRE_INSECURE_NO_AUTH=1` do when a request carries a wrong token?
  - Did: everything passes as `anonymous` (a valid token still names the caller in the log); live upgrades always pass. `?token=` is still refused. A JSON warning line is printed at start.
  - Why: "run with no access token (for development)"; local nodes and scenario servers in that mode must not trip over stale tokens.
  - Reverse: the `config.insecureNoAuth` branches in `access/index.ts`.
- **D-P01-4** · confidence: med
  - Question: the CSP the built app needs.
  - Did: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; connect-src 'self' ws://<host> wss://<host>; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Responses that already set a CSP (vault files, inert SVG) keep theirs. Checked in Chromium: no CSP violations opening and editing a note.
  - Why: rendered tables use `style="text-align"` attributes and the editor sets styles; remote images in notes load in the baseline (Obsidian). Consequence: the web app served by one server can only talk to that server (the Android shell is not affected by the server's CSP).
  - Reverse: `csp()` in `access/guard.ts`; drop `https:` from `img-src` to block remote images.
- **D-P01-5** · confidence: low
  - Question: the body limit (`maxNoteBytes` + 64 KiB) applies per request, and `SyncClient.pushDirty` sends every dirty note in one push.
  - Did: followed the packet. A first sync of more than about 2 MiB of dirty notes (a local node scanning a large vault folder, a device long offline) now gets 413 and keeps retrying.
  - Why: the packet's rule; fixing it needs `packages/sync/src/client.ts` (push in batches under the limit), which this packet does not own.
  - Reverse: either batch pushes in `SyncClient.pushDirty`, or raise the non-file body limit in `sizeLimits` (`access/guard.ts`) and keep the per-note check. Suggest a follow-up packet.
- **D-P01-6** · confidence: med
  - Question: rules for token names and given tokens in `quire tokens add`.
  - Did: names are 1-64 of letters, digits, `.`, `_`, `-`; `admin` is reserved for `QUIRE_TOKEN`; a revoked name cannot be reused (the name is the primary key); `--token` needs at least 8 characters and only works with one name; adding several names is all or nothing.
  - Why: simplest reversible rules that keep names readable in logs and `onRevoke` unambiguous.
  - Reverse: `tokenAdmin.add` in `access/tokens.ts`.
- **D-P01-7** · confidence: med
  - Question: the CLI opens the database in its own process: may it migrate an older schema?
  - Did: it creates a fresh database (so tokens can exist before the first start), but refuses an older schema with "start the server once to upgrade it", because only the server runs the backup hook before migrating. The server migrates before `assertConfigured`, so starting it once without a token upgrades the folder and then exits with the token message.
  - Why: never migrate without the pre-migration backup (R-BAK-01).
  - Reverse: pass `beforeMigrate(config, file)` from `backup/` in `access/tokens-cli.ts` (adds an access to backup dependency).
- **D-P01-8** · confidence: med
  - Question: what else should a revocation or the note limit reach?
  - Did: revocation closes live connections (via `onRevoke`) and voids that token's tickets; event streams already open with a revoked token's ticket stay open until they drop, and live room edits are not capped at `maxNoteBytes`.
  - Why: the spec names live connections only; closing streams or capping rooms needs `live/events.ts` or `live/rooms.ts`, not owned here.
  - Reverse: follow-up in `live/`: track the ticket's name per stream and close on revoke; reject room updates past the limit.
- **D-P01-9** · confidence: med
  - Question: what is "its own origin" for CORS behind a TLS proxy?
  - Did: an `Origin` whose host equals the request's `Host` header is same-origin (the scheme is not compared); `QUIRE_ALLOWED_ORIGINS` are matched exactly; others get no `Access-Control-Allow-Origin` (the request is not refused). Preflights are answered before the guard.
  - Why: behind a proxy the server sees `http` while the browser uses `https`.
  - Reverse: `originPolicy` in `access/guard.ts`.
- **D-P01-10** · confidence: high
  - Question: the live client and dead tickets.
  - Did: `live.ts` treats a connection closed before it ever opened (a refused handshake, which y-websocket never reports as "disconnected" and would retry with the same URL) as a drop and rejoins with a fresh ticket; a failed ticket fetch retries later instead of leaving an unhandled rejection.
  - Why: packet: "make sure a refused reconnect with a spent ticket falls back to a new join".
  - Reverse: the `connection-close` handler and the `try` around `streamParams` in `apps/web/src/live/live.ts`.
- **D-P01-11** · confidence: high
  - Question: unbounded ticket memory.
  - Did: at most 10 000 outstanding tickets (oldest dropped); expired tickets swept every second.
  - Why: a valid token looping on `POST /api/tickets` should not grow memory.
  - Reverse: `MAX_TICKETS` in `access/tickets.ts`.
- **D-P01-12** · confidence: high
  - Question: R-ACC-04 needs `"pixel" types "!" at the end of "a.md"` on a browser device, but that step (`scenarios/steps/live.steps.ts`, not owned or borrowed) only drives system devices and throws "is not a system-level device".
  - Did: did not edit it. Asking the coordinator to borrow `quire/scenarios/steps/live.steps.ts` for this change to the two "types ... at the start/end of" steps: `const dev = world.device(d); if (dev instanceof SystemDevice) dev.insertLive(path, 'end', text(body)); else await dev.append(path, text(body));` (`Device.append` exists on both drivers). The rest of R-ACC-04 was checked in Chromium outside the suite: the server had `a.md` reading `hello!`, the event stream and the live socket used `?ticket=`, and no URL held the token.
  - Why: run protocol: never edit an unlisted path.
  - Reverse: n/a.
