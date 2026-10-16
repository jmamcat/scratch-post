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
status: todo
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
