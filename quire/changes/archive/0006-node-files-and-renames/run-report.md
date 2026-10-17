---
change: 0006-node-files-and-renames
run: 2026-10-17-03
agents: [claude-code/tier-A (single agent; no worker packets)]
result: complete
---

# Run report: Local nodes replicate attachments and renames

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P01 specs, scenarios, replication of files and renames | single agent, tier A | sequential | yes: the pieces share the replicator and one budget-conscious agent is cheaper than a wave |

## Usage

One slice; tokens not reported per slice (`usage/ledger.csv`, scope `change`, source
`unknown`).

## Summary

- **Attachments.** `NodeFiles` is the replicator's `FileSink`
  (`apps/server/src/sync/node-files.ts`).
  - **Base.** Per path it keeps an upstream base in the node's key-value table: the
    upstream revision and blob, and the local revision that matched them.
  - **Flush** (start of each cycle). Local file heads that moved since their base go up
    through `/api/files` with the base revision, so upstream's "keep both" rule applies
    as it does for browsers. If upstream kept another version at that path, the node
    takes it, and the conflict copy arrives with the next pull.
  - **Pull.** Fetches the bytes from `/api/blobs/<hash>` and commits through the node's own
    file service as device `upstream`. A local change not yet uploaded is left for the
    next flush.
- **Renames up.** For a path never sent upstream, `NodeStore.get` reads where the node's
  first revision at that name came from. If upstream knows that path, the doc goes up
  with `renamedFrom`, sorted before the old path's deletion as browsers do.
- **Renames down.** `SyncClient.pull` passes a pulled head's `renamedFrom` to its store
  (`LocalStore.put(doc, origin?)`, a new optional argument). Browsers ignore it; the
  node's store pushes the rename into its own log, so its history follows.
- **Server file service.** `Files` exposes `put`, `remove` and `blob` (the code the routes
  already ran), so the replicator writes files the way an upload does: blob store, vault
  mirror, events.
- **Scenarios.** R-SYN-09 gains "Attachments both ways", "A rename on the node keeps its
  history upstream" and "A rename upstream keeps its history on the node". All three
  failed with the code change stashed and pass with it.
- **Docs.** The 0.1.0 limitation paragraphs in `quire/README.md` and `deploy/README.md`
  now say what a node replicates; `quire/CHANGELOG.md` has an Unreleased entry.

## I have some questions, but I proceeded with these recommendations

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-0006-1 | Does the node fetch bytes eagerly or on first read? | Eagerly: the node stands in for the cloud, so its clients must open files while the cloud is down | high | `NodeFiles.apply` |
| D-0006-2 | A file changed on both sides | Upstream's rule decides: it keeps both, the node's version under `name (device).ext`. The node then takes upstream's version at the original path and gets the copy by pull. Nothing is lost | high | `NodeFiles.upload` |
| D-0006-3 | Where does the node look up upstream's current file after a conflict? | `GET /api/docs?kind=file`, because `/api/doc` accepts note paths only. A path missing there counts as deleted upstream | med | add file paths to `/api/doc` |
| D-0006-4 | A rename upstream, then an edit upstream, before the node pulls | The node sees only the newest head, which has no `renamedFrom`. The note arrives as new and its node history starts there. Listed in the proposal's out-of-scope section | med | walk upstream history in `pull` |
| D-0006-5 | An upload upstream refuses (size, path) | Not retried: its base is marked as seen and the cycle reports the error once, as browsers drop refused uploads | med | `NodeFiles.flush` |

## Blocked or skipped

Nothing blocked.

## Verification

| Gate | Result |
| --- | --- |
| check | green: 0 violations, 5 warnings (`packages/sync/src/client.ts` 357 → 364 lines, still a warning) |
| scenarios | 135 passed (2.9m) |
| new scenarios with the code stashed | 3 failed, the 2 existing R-SYN-09 scenarios passed |

## Playbook friction

None new.

## Spec drift

None: R-SYN-09 is MODIFIED in full and keeps its two earlier scenarios.
