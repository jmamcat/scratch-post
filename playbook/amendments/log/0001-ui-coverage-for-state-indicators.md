---
id: 0001-ui-coverage-for-state-indicators
status: accepted
proposed_by: claude-code/claude (coordinator, Quire change 0001)
date: 2026-10-16
evidence: counterexample
affects: [modules/scenarios/README.md]
version_bump: minor
---

# State indicators need a @ui scenario

## Problem

In Quire change 0001, all 43 `@system` scenarios passed while the web client showed
"1 pending" forever after a note was edited live and then left. The sync client updated its
store when a live note's base moved but did not notify listeners, so the UI's in-memory copy
went stale. The `@system` driver (`quire/scenarios/support/system-device.ts`, `isPending`)
read the client's store directly, which was correct, so no system scenario could see the
bug. Five `@ui` scenarios (R-NAV-01, R-NAV-02, R-NAV-04, R-RND-02, R-RND-03) failed on it;
fixed in commit b4040ce (`packages/sync/src/client.ts`).

## Change

```diff
 - Steps assert observable outcomes (what a user sees, what a client receives, what is on
   disk), never internal state.
+- Every indicator a person relies on to know the state of their data (sync status, pending
+  marks, conflict counts, offline banners) has at least one `@ui` scenario that reads it
+  from the screen. A `@system` driver that reads the client's own store cannot see bugs in
+  how that state reaches the screen.
```

## Evidence

Counterexample walk-through:

- Under the current text, the suite for R-SYN-01 ("shows a.md as pending sync") was written
  at the `@system` layer only. It is a legitimate system scenario and it passed.
- The bug lived between the store and the screen. Only scenarios that looked at the status
  bar could fail, and they failed only by accident (they happened to create two notes).
- Under the amended text, the pending indicator must have its own `@ui` scenario, so the
  bug is caught on purpose by a scenario named after the indicator, not by luck.

No other play or module changes; no metric gets worse (one more `@ui` scenario per
indicator, a few seconds each).

## Guards

Stop conditions unchanged. Gates unchanged. Still harness, model, language and project
agnostic. No records deleted.

## Outcome

Accepted. VERSION 1.0.0 to 1.1.0. Quire follow-up: add `@ui` scenarios for the pending mark
and the sync status (listed in the 0001 run report).
