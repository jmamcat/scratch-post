---
capability: ops
prefix: OPS
---

# Operations

Running Quire for real: knowing it is alive and ready, seeing what it does, shipping it as a
container, and proving it holds the expected load (one owner, up to 32 people or devices).

## ADDED Requirements

### Requirement R-OPS-01: Health and readiness

`/api/health` SHALL answer 200 without a token while the process runs. `/api/ready` SHALL answer 200 only when the database and the vault folder are writable and, when backups are on, the backup folder is writable and the last backup attempt succeeded; otherwise it SHALL answer 503 and name the failing checks.

Layer: system

#### Scenario: Ready, then not

- **GIVEN** a cloud server with a backup folder
- **AND** device `pixel`
- **THEN** the readiness check succeeds
- **WHEN** the backup folder becomes unwritable
- **AND** `pixel` has `a.md` reading `x`
- **AND** 2 seconds pass
- **THEN** within 5 seconds the readiness check fails naming `backup`

### Requirement R-OPS-02: Structured logs

The server SHALL write one JSON line per request to standard output with time, level, request id, method, route, status, duration in milliseconds and device, at the level set by `QUIRE_LOG_LEVEL` (default `info`), and SHALL never write access tokens, tickets or note text to the log.

Layer: system

#### Scenario: Logs without secrets

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** device `pixel` using the token `s3cret`
- **WHEN** `pixel` has `a.md` reading `secret plans`
- **THEN** the cloud server's log has a JSON line for `POST /api/sync/push` with status 200
- **AND** the cloud server's log does not contain `s3cret`
- **AND** the cloud server's log does not contain `secret plans`

### Requirement R-OPS-03: Metrics

`/api/metrics` SHALL report, in the Prometheus text format and behind the token, request counts by route and status (`quire_http_requests_total`), commits (`quire_commits_total`), open conflicts (`quire_conflicts_open`), live rooms and connections (`quire_live_rooms`, `quire_live_connections`), a histogram of push durations (`quire_push_duration_seconds`), the time of the last successful backup (`quire_backup_last_success_timestamp_seconds`) and the database size (`quire_db_bytes`).

Layer: system

#### Scenario: Counting commits

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `a.md` reading `x`
- **THEN** the metrics report at least 1 for `quire_commits_total`
- **AND** the metrics include `quire_push_duration_seconds`

### Requirement R-OPS-04: Container deployment

The project SHALL ship a container image that runs the server as a non-root user, keeps the data and backup folders in volumes, and checks `/api/health`; and a Compose file that starts a cloud server, with optional profiles for a local node (`local`) and a TLS proxy (`tls`). Secrets SHALL come from an environment file or Compose secrets, never from the image.

Layer: deploy

#### Scenario: Compose up

- **GIVEN** the container image is built
- **WHEN** the Compose stack starts with an access token
- **THEN** within 60 seconds the stack's cloud server is healthy
- **AND** the stack's cloud server runs as a non-root user
- **AND** a note written through the stack survives a restart of the stack

### Requirement R-OPS-05: Load of 32 devices

The server SHALL serve 32 devices syncing at the same time, 8 of them editing one note live, with every device converging and the 95th percentile push taking under 500 ms on the machine running the scenarios.

Layer: system

#### Scenario: 32 devices at once

- **GIVEN** a cloud server
- **AND** 32 devices
- **WHEN** every device makes 20 edits across 50 shared notes while 8 of them type in `live.md`, with seed 7
- **THEN** every device matches the cloud server
- **AND** the 95th percentile push took under 500 ms
- **AND** no request failed
