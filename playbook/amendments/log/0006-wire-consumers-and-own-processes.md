---
id: 0006-wire-consumers-and-own-processes
status: accepted
proposed_by: claude-code/tier-A (coordinator, Quire change 0002)
date: 2026-10-16
evidence: counterexample
affects: [core/packets.md, core/run-protocol.md]
version_bump: minor
---

# Integration wires new packages into consumers; workers stop only their own processes

## Problem

Quire 0002, from the packets and worker reports:

1. P00 created the package `@quire/views` with stub exports but did not add it to
   `quire/apps/web/package.json`. Wave 2 packets P03, P04 and P06 import it from the web
   app. The manifest belongs to P00, so none of them could fix it: P06 set `status:
   blocked`; P03 and P04 verified with scratch alias configs outside the repo and waited.
   The coordinator then added one line and three packets went green. Usage ledger: P04 took
   11.1 minutes and P03 7.7, partly waiting.
2. P01 and P05 each ran `pkill -f "...src/main.ts"` to stop a server they had started. That
   pattern matches every worker's scenario servers on the shared machine. Neither run hit
   another worker by luck (P05 reported it as a possible side effect; P01's first `pkill`
   ended its own shell).

## Change

```diff
 core/packets.md, rule 2:
   root CI) belong to `P00`, owned by the coordinator.
+  When a change adds a package or module, `P00` also declares it in the manifest of every
+  consumer the packets name, so no worker needs a manifest edit.

 core/run-protocol.md, section 3:
+Workers share one machine: stop only processes you started, by their process id, never by a
+name pattern (`pkill -f`, `killall`).
```

## Evidence

Counterexample walk-through. Under the amended text P00 adds `"@quire/views":
"workspace:*"` to `@quire/web` along with the stubs; P03, P04 and P06 build and typecheck
on their first try, and P06 is not blocked. Under the amended text a worker records the PID
of the server it starts and stops that PID; another worker's servers cannot match.

## Guards

Stop conditions unchanged; gates unchanged; harness, model, language and project agnostic
(manifests and process ids exist everywhere); no records deleted.

## Outcome

Accepted. Version 1.6.0.
