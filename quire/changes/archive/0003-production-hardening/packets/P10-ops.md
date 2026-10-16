---
id: 0003-production-hardening/P10
title: JSON logs, metrics, readiness
lane: E
depends_on: [P00]
owns:
  - quire/apps/server/src/ops/**
  - quire/scenarios/steps/ops.steps.ts
borrows: []
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/server/src/**
  - quire/scenarios/**
size: S
revision: 1
status: done
claimed_by: claude-code/tier-C
---

# JSON logs, metrics, readiness

## Context

Implements R-OPS-01, R-OPS-02 and R-OPS-03
(`quire/changes/0003-production-hardening/spec/ops/spec.md`). P00 wired the contract in
`apps/server/src/ops/index.ts`: `app.ts` calls `ops.installFirst(app)` before every other
middleware and `ops.routes(app)` after the token guard; `main.ts` calls
`ops.setLiveStats(() => live.stats())` and logs start-up through `ops.log`. Replace the
stub; keep the exports.

## Contract

```ts
export function createOps(deps: { config: Config; store: SqliteRevisionStore; hooks: { afterWrite: Set<...> } }): Ops;
// Ops: log, metrics, installFirst(app), routes(app), setLiveStats(fn)
```

Rules:

- **Logs**: one JSON object per line on stdout (`warn` and `error` too), fields `time` (ISO),
  `level`, `msg`; request lines add `id` (also sent back as `X-Request-Id`), `method`,
  `route` (the matched pattern, `c.req.routePath`, never the URL with its query), `status`,
  `ms`, `device` (`c.get('principal')`, set by the token guard in P01; `-` when absent).
  Respect `config.logLevel`. Never log query strings, headers, bodies or note text.
- **Metrics** (`GET /api/metrics`, Prometheus text format 0.0.4, behind the guard):
  `quire_http_requests_total{route,status}`, `quire_commits_total` (count `afterWrite`),
  `quire_conflicts_open` (count on scrape), `quire_live_rooms`, `quire_live_connections`,
  `quire_push_duration_seconds` histogram (buckets 0.005 to 2.5 s, measured around `POST
  /api/sync/push`), `quire_backup_last_success_timestamp_seconds` (kv
  `backup.lastSuccessAt`, ISO, written by the bundle writer), `quire_db_bytes` (size of
  `quire.db` plus `-wal`).
- **Readiness** (`GET /api/ready`, no token; P01's guard exempts it): checks `db` (a write
  inside a rolled back transaction), `vault` (create and remove a file in the vault folder),
  and when `config.backupDir` is set `backup` (the folder exists and is writable, and kv
  `backup.lastError` is empty). 200 `{ ok: true }` or 503 `{ ok: false, failing: [...] }`.
- Steps in `quire/scenarios/steps/ops.steps.ts`: STEPS.md "Operations" rows about
  readiness, logs, metrics and `the backup folder becomes unwritable` (replace the backup
  folder with a file; that defeats root too). The log steps read
  `world.requireCloud().output`.

The R-OPS-01 scenario needs the bundle writer (P03, a later wave) to record
`backup.lastError`; it is expected to fail until then. Say so in your result.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-OPS-02|@R-OPS-03|@cap-sync|@cap-live"
```

R-OPS-02 needs a token-protected server and a device using the token; the shared steps
exist. If R-OPS-02 can only pass once P01 lands (the guard sets `principal`), log the
`device` as `-` meanwhile and say so.

## Decisions log

- **D-P10-1** · confidence: med
  - Question: Which level do request lines carry?
  - Did: 5xx lines at `error`, 4xx at `warn`, everything else at `info`; `QUIRE_LOG_LEVEL` filters them as usual.
  - Why: the spec says the level is set by `QUIRE_LOG_LEVEL` but not per line; failures stay visible when the level is raised to `warn`.
  - Reverse: in `ops/requests.ts`, log every request line at `info`.
- **D-P10-2** · confidence: high
  - Question: Where does the request id come from?
  - Did: generated per request (`randomUUID`); a client's `X-Request-Id` is ignored and the generated id is sent back in the header.
  - Why: a client-chosen id could forge or inject log lines; the spec only asks for an id.
  - Reverse: read the incoming header in `ops/requests.ts`, with a length and character check.
- **D-P10-3** · confidence: med
  - Question: Does `quire_conflicts_open` count only `open` conflicts or also `review`?
  - Did: `open` only (`store.listConflicts('open')`).
  - Why: the spec says "open conflicts"; STEPS.md separates "open items" from "items under review".
  - Reverse: include `review` in `ops/endpoints.ts`.
- **D-P10-4** · confidence: high
  - Question: Which buckets for `quire_push_duration_seconds`?
  - Did: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5 and `+Inf`.
  - Why: the packet says "buckets 0.005 to 2.5 s"; these are the Prometheus defaults cut at 2.5.
  - Reverse: `HISTOGRAM_BUCKETS` in `ops/metrics.ts`.
- **D-P10-5** · confidence: med
  - Question: How do readiness checks test writability without leaving traces?
  - Did: `db` runs an insert into `kv` inside `BEGIN IMMEDIATE` and rolls back in a `finally`; `vault` and `backup` create and remove a dot-prefixed probe file (`.quire-ready-<uuid>`).
  - Why: the vault mirror ignores dot-prefixed and non-`.md` names, so the probe never becomes a note; a rolled back write leaves no row.
  - Reverse: in `ops/ready.ts`, use a temporary table for `db`, or write the probe with a different name.
- **D-P10-6** · confidence: high
  - Question: What does `quire_backup_last_success_timestamp_seconds` report before any backup?
  - Did: `0`, otherwise `kv backup.lastSuccessAt` parsed to Unix seconds.
  - Why: the Prometheus convention for "never".
  - Reverse: omit the sample instead.
- **D-P10-7** · confidence: med
  - Question: Which token do the device labels use when the guard does not set `principal`?
  - Did: `device` is the principal only when it is a non-empty string, otherwise `-`. The P00 stub guard never sets it, so every line reads `-` until P01 lands.
  - Why: the packet says `-` when absent; a string check avoids logging an object by accident.
  - Reverse: if P01 stores an object (for example `{ name }`), change the read in `ops/requests.ts`.
- **D-P10-8** · confidence: med
  - Question: Who defines `a cloud server with a backup folder`, and how does the unwritable-folder step find the folder?
  - Did: not defined here (P03 owns it in `steps/backup-bundles.steps.ts`). The step `the backup folder becomes unwritable` reads `world.requireCloud().env.QUIRE_BACKUP_DIR`.
  - Why: STEPS.md places it under Backup, and P03's packet says it sets `QUIRE_BACKUP_DIR` in the same env bag.
  - Reverse: if P03 keeps the folder elsewhere, point the step at it in `steps/ops.steps.ts`.
- **D-P10-9** · confidence: high
  - Question: Do request lines for `/api/ready` and `/api/metrics` count in the request metrics?
  - Did: yes, like every request, under their route patterns.
  - Why: the spec counts requests by route and status without exceptions.
  - Reverse: skip the metric in `ops/requests.ts` for those two paths.

Notes for the coordinator (not decisions):

- `/api/ready` is registered after the stub guard in `access/index.ts`, which exempts only `/api/health`. A server started with a token answers 401 on `/api/ready` until P01's guard exempts it. Readiness passes on tokenless servers, which is what the scenarios use.
- `shared/http.ts` `onError` still writes unexpected errors with `console.error(err)` to stderr. It is not owned by P10 and is not on stdout, so R-OPS-02 is unaffected; a JSON error line there would need that file.

## Acceptance result

- `playbook/bin/gate.sh check`: exit 0. Typecheck clean; dependency rules: 0 violations (185 modules); structure: 0 violations, 5 soft-size warnings, none in `ops/` or the new steps.
- `playbook/bin/gate.sh scenarios "@R-OPS-02|@R-OPS-03|@cap-sync|@cap-live"`: exit 0, **22 passed, 0 failed**. Covers R-OPS-02 "Logs without secrets", R-OPS-03 "Counting commits", R-SYN-01..10 (15 scenarios, `@cap-sync`), R-LIV-01..05 (5 scenarios, `@cap-live`).
- R-OPS-01 "Ready, then not" (outside the acceptance tags): fails with `Missing step: Given a cloud server with a backup folder`. That step belongs to P03 and is not yet defined. The readiness logic was checked by hand: backup folder replaced by a file gives `503 {"ok":false,"failing":["backup"]}`; the folder restored gives `200 {"ok":true}`; no probe files left behind.
- Manual checks against a running server: `X-Request-Id` on responses; route is the pattern (`/api/*` for a 404, no query string); the note text and token are absent from the log; `QUIRE_LOG_LEVEL=warn` suppresses info lines; metrics text includes HELP/TYPE lines and the histogram buckets. Both manual servers stopped by PID.
- R-OPS-05 "32 devices at once" and R-OPS-04 are not in this packet's scope. Their steps are not defined.
- Files written: `quire/apps/server/src/ops/{index,types,logger,metrics,requests,ready,endpoints}.ts`, `quire/scenarios/steps/ops.steps.ts`, and this packet's status and log.
