# Module: hardening

What "production ready" means, written as requirements a change can carry and scenarios
that prove them. Use it before calling an MVP production ready, before a first deployment,
and whenever a play adds a new surface (a route, a port, a storage format, a client).

The rule: **every item below either becomes a requirement with a scenario, or gets a
decision record saying why it does not apply.** A checklist ticked in prose proves nothing;
a scenario does. The project owner states the load target and the deployment shape (for
example "one owner, up to 32 people or devices; Docker and Compose"); the agent never
guesses them.

## Readiness review

Run it as the Frame step of a hardening change (the add-feature play is usually right).
For each area, answer the questions against the running system, not the docs:

| Area | Questions | Typical requirement | Proven by |
| --- | --- | --- | --- |
| **Access** | Does it refuse to start without credentials? Can each person or device have its own revocable credential? Are credentials hashed and compared in constant time? | Secure by default; an explicit, loud development escape hatch (`*_INSECURE_*=1`). Named credentials up to the stated user count. | A scenario that starts with no credential and expects refusal; one that revokes a credential and sees its live connections close. |
| **Secrets in transit** | Can any secret end up in a URL, a log line, a referrer or browser history? What about transports that cannot send headers (EventSource, WebSocket)? | Credentials only in headers; short-lived single-use tickets for header-less transports. | A scenario that records every request URL the client made and finds no secret; a log scenario that greps the output. |
| **Surface** | Which origins may call it? Which headers does every response carry? How big may a request be? What happens after many failed logins? | Origin allow-list; CSP with `frame-ancestors 'none'`, `nosniff`, `no-referrer`; size limits per route; throttling of failed checks. | Scenarios per rule; each limit has one that crosses it. |
| **Data safety** | Can the schema change without losing data? Can one item, and the whole system, go back to any earlier state? What does retention delete, and what must it never delete? Can a lost server be rebuilt from backups, and has that been done? | Schema versions with ordered, transactional migrations and a backup first; per-item history; whole-system restore points built from groups of changes; compaction rules that never drop heads or anything still referenced; chained, verified, deduplicated backups. | A migration scenario from the oldest supported schema; a restore drill scenario (lose the data folder, restore, compare); a tamper scenario (change a byte, verification fails). **A backup without a restore scenario is not a backup.** |
| **Offline** (local-first products) | Can the client start with no network after one visit? Does an update ever reload under the user? | Cached app shell; "reload to update" instead of forced reloads. | A browser scenario that goes offline and reloads. |
| **Observability** | How does an orchestrator know it is alive, and ready? What does one request look like in the log? What can be graphed? | Separate liveness and readiness; one structured log line per request with no secrets; metrics in a standard format. | Scenarios that break a dependency (a full or read-only backup folder) and see readiness fail with the reason. |
| **Deployment** | How is it run? As which user? Where does state live? How do secrets get in? How is it upgraded, and how is an upgrade rolled back? | A container image (non-root, volumes for state, health check), a Compose file with profiles for optional parts, secrets from env files or secrets, a written upgrade and restore procedure. | A `@deploy` scenario that builds the image, starts the stack, checks health and the user id, and survives a restart. It runs in its own `deploy` gate because it needs Docker. |
| **Load** | What load did the owner state? Does it hold, with headroom, on ordinary hardware? | A requirement with the number in it ("32 devices, 8 typing in one note, p95 push under 500 ms"). | A seeded load scenario that prints p50, p95, p99 and errors; run it three times. Fix only measured bottlenecks. |
| **Performance budget** | What does the first load cost a client? | A size budget for first-load assets; heavy features load on first use. | A scenario that builds and measures. |
| **Continuity** | Do the gates run on every change without anyone remembering to? Which run on every pull request, which on a schedule? | A CI workflow that runs the fast gates on every push and pull request, and the slow ones (`deploy`, `ux`) weekly and on demand. | The workflow file, linted, and its first green run. |
| **UX and accessibility** | Do all screens pass accessibility rules, contrast and reflow in every theme? | A UX gate (`modules/ux`). | The UX scenario and the `ux` gate with a committed baseline. |

## Rules of thumb

- **Defaults are the product.** Whatever happens with no configuration is what most
  deployments will run. Make that the safe behaviour, and make the unsafe one loud.
- **Test harnesses get escape hatches, not products.** If scenarios need insecure mode, the
  harness sets it explicitly (and the security scenarios turn it off), so every older
  scenario keeps its meaning.
- **One log for everything that must be restorable.** Prefer putting new kinds of data
  (attachments, renames) into the same versioned log as the old ones, so history, restore
  points and backups cover them with no second mechanism.
- **Group changes the way people think of them.** Restore points and backups are easier to
  use when they follow bursts of work (one device, short gaps) than a fixed clock.
- **Gates that need special machinery get their own gate name** (`deploy`, `ux`) in
  `playbook.yaml`, so `check` and `scenarios` stay fast and runnable anywhere.
- **Record what the environment could not do.** If a registry is rate limited or a tool
  is missing, write the workaround into the packet and `adapters/environments.md`; never
  silently skip the gate.

## Packets

A hardening change usually cuts one packet per area above, plus an integration packet that
adds the schema version, configuration fields and stubs first, so the area packets own
separate files. Data safety is often two packets (history and restore; backups and restore
drills) in sequence. Load and UX gates run last, when nothing else is editing the product.
