# ops (server)

Running the server for real: JSON request logs, Prometheus metrics, readiness.

- Public API: `createOps` (`log`, `metrics`, `installFirst`, `routes`, `setLiveStats`).
- Depends on: `platforms/`, `vault/`.
- Specs: `R-OPS-01..03`. Container files live at the repository root (`R-OPS-04`).
