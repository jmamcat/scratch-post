---
change: 0001-mvp-foundation
run: 2026-10-16-01
agents: [claude-code/claude (coordinator, P00, P02 to P06, P09, P10), claude-code/claude (worker, P01), claude-code/claude (worker, P07, P08)]
result: complete
---

# Run report: MVP foundation

## Summary

- **Storage and sync core** (P02, P03): three-way merge with per-property front matter and
  five collision tiers; revision-based sync with conflict records, rebase during round
  trips, delete-versus-edit handling.
- **Server** (P04 to P06): append-only SQLite revision log, a vault folder that Obsidian can
  open (edits made there are picked up), SSE events, Yjs live rooms that commit to the log,
  and a local node mode that replicates with the cloud and keeps working when it is down.
- **Rendering and navigation** (P01): Obsidian Flavored Markdown (wikilinks, embeds,
  callouts, highlights, tags, footnotes, comments), Obsidian link resolution, link index,
  offline search.
- **Web client** (P07, P08): local-first (IndexedDB), Obsidian layout and shortcuts, live
  editing with remote cursors, review inbox with per-change choices, version history.
- **Android** (P09): Capacitor wrapper and build guide; no APK (no SDK in the container).
- **Verification and structure** (P10, plus the second half of this run): unit tests were
  replaced by 66 generated scenarios (45 `@system`, 21 `@ui`), the code was reorganised into
  capability slices with enforced dependency rules, and a one-command demo was added.

## I have some questions, but I proceeded with these recommendations

Kindly direct me if any of these were incorrect. Each one is reversible as noted.

| # | Question | What I did | Why | Confidence | To reverse |
| --- | --- | --- | --- | --- | --- |
| D-P03-1 | Typing during a sync round trip overlaps a merged server change: who wins? | Local typing wins; the server's version stays in history, no review item | never discard what is on screen; the window is one round trip | med | `packages/sync/src/client.ts` pushDirty: open a review item instead |
| D-P05-2 | A pushed change and live typing overlap in the moment between flush and apply | Live typing wins in the room; pushed text stays in history | window is one hash computation | low | `apps/server/src/live/rooms.ts` apply(): open a review item when the merge is not clean |
| D-P08-2 | Connection drops within ~1.5 s of live typing, before the room commits | Those edits come back as an open conflict instead of a clean merge; nothing is lost | using the room text as base could silently drop edits that never reached the server | med | `apps/web/src/live/live.ts` |
| D-P06-1 | Where do local node versus cloud conflicts show? | In the cloud's inbox only; the local node's inbox shows its LAN clients' conflicts | one authority per collision | med | replicate conflict records down in `apps/server/src/sync/replicator.ts` |
| D-P04-1 | A note's file is missing when the server starts | Restore it from the log; only deletions seen while running count | a moved or new folder must never wipe a vault | med | `apps/server/src/vault/mirror.ts` scan() |
| D-P04-3 | Should the local node follow the cloud's event stream? | No; it polls every 10 s and pushes 1 s after local edits | Node 22 has no stable EventSource; restarts stay simple | med | add an SSE reader in the replicator |
| D-P03-4 | The same path created on two devices independently | Both texts kept, flagged under Review suggested | daily notes are the common case | med | `packages/sync/src/server.ts` treat as a content conflict |
| D-P07-3 | Rename | Create plus delete; links to the note are not rewritten | rename tracking is a listed follow-up | med | rename tracking change (Obsidian rewrites links by default) |
| D-P07-5 | Changing the server URL in Settings | Unsynced edits are kept as new notes, everything else is pulled fresh | never lose unsynced work; never mix two vaults | med | `apps/web/src/sync/workspace.ts` prepareStoreForServer |
| D-P01-2 | "Shortest path" for link resolution | Fewest characters, then alphabetical; folder-qualified targets match path suffixes | literal reading of the spec and Obsidian's API docs | med | `packages/navigate/src/resolve-link.ts` |
| D-P01-4 | Which bare URLs become links | Only URLs with a scheme | otherwise `notes.md` links to the `.md` country domain | med | `packages/render/src/parser.ts` linkify settings |
| D-P01-1 | Hidden folders and Unicode in paths | Any segment starting with `.` is refused; paths are NFC-normalised | Obsidian hides dot folders; macOS and browsers spell names differently | med | `packages/vault/src/paths.ts` |
| D-P00-1 | Newest major versions of the toolchain? | Previous stable majors (TypeScript 5.9, vite 7, Capacitor 7, Playwright 1.56) | the newest are fresh rewrites; stability first | med | bump versions, rerun gates |
| D-P09-1 | Generate the native Android project? | No: config and guide only | no SDK here; an untested Gradle tree adds noise | med | `pnpm --filter @quire/android add` on a machine with the SDK |
| R-1 | Testing approach after "no unit tests" | Specs generate Gherkin; playwright-bdd runs it against real server processes (`@system`) and the real app in Chromium (`@ui`); a seeded multi-device simulation; an approved rendering gallery in place of the markdown unit tests | research in `playbook/modules/scenarios/sources.md`: boundary-level verification is what works for agents | med | `playbook/modules/scenarios` |
| R-2 | Code structure standard | Vertical slices named after spec capabilities, functional core inside, dependency-cruiser rules, module READMEs, ARCHITECTURE.md | language-agnostic, checkable, maps requirement IDs to folders | med | `playbook/modules/structure` |
| R-3 | Name for the methodology "product" | A **playbook** (plays chosen per situation, executed by anyone, revised with evidence), still named RefSpec | framework, engine and specification each imply the wrong thing | med | rename the folder and README |
| R-4 | Scenario devices: in-process server or real process? | Real server processes per scenario (about 1 s each); the whole suite still runs in under a minute | closer to real use, and process restarts are part of the scenarios | high | `quire/scenarios/support/servers.ts` |
| R-5 | `utils`-style names banned, 300/500 line limits | Five files sit between the soft and hard limit (App.tsx 439, render parser 405, workspace 403, merge 327, sync server 313) | warnings, not violations; splitting them is a follow-up | med | split in a later change |

High-confidence decisions, one line each: merge keeps its own five-line front matter
splitter (D-P02-1); whitespace tier before intraline (D-P02-2); a longer append is not
duplicated (D-P02-3); conflicts are recorded even when the provisional text equals the head
(D-P03-2); the HTTP transport lives in `@quire/sync` and is shared (D-P03-3); paths travel as
`?path=` (D-P04-2); live rooms commit inside the sync queue (D-P05-1); single newlines render
as line breaks like Obsidian (D-P01-3); remaining P01 parsing details are in packet P01.

## Blocked or skipped

- No Android APK: needs the Android SDK (`apps/android/README.md` has the steps).
- Not in scope and not built: Live Preview editing mode, editable properties pane, note
  transclusion, rename tracking, databases and Bases views, slash menu, plugins, end-to-end
  encryption, sharing.

## Verification

- `pnpm -C quire check`: typecheck of 9 packages, dependency rules (112 modules, 0
  violations), structure rules (19 modules, 0 violations, 5 size warnings).
- `pnpm -C quire scenarios`: 66 scenarios from 52 requirements, all passing; the full suite
  was run twice in a row with no flaky results (64 at the time, before R-SYN-10 was added;
  R-SYN-10's two scenarios pass and the second was shown to fail without its fix).
- Demo: `pnpm -C quire demo` and `demo:conflict` driven in Chromium; seed replicated to
  the local node; staged conflict visible in the review inbox.

## Defects found by the scenarios

- **Stale "1 pending"** after editing a note live and leaving it: the sync client updated a
  live note's base without notifying listeners. 43 `@system` scenarios could not see it;
  five `@ui` scenarios failed on it. Fixed in `packages/sync/src/client.ts`; R-SYN-10 now
  names it.
- **Web build not served** after moving the server config into `platforms/` (path one level
  short). Found by the web worker; fixed.

## Playbook friction

- A system-level driver that reads the client's store hid a UI-only bug. Accepted as
  amendment 0001 (playbook 1.1.0): every state indicator needs a `@ui` scenario.
- `git add` of a folder with uninitialised submodules staged their removal. Worth a line
  in `modules/references`: create the empty submodule folders, or use `git add -u`
  carefully. Candidate amendment.
- Packets written before the switch to scenarios still name `vitest` in some acceptance
  lines; the gates in `playbook.yaml` are what count. Candidate amendment: packets should
  reference the gate names from `playbook.yaml`, never tool commands.

## Spec drift

- R-RND-00 (approved gallery) was added during the run so the markdown rules stay pinned
  after unit tests were removed.
- R-SYN-10 was added after the stale pending defect.
- Requirement wording elsewhere matches the build. Archive after review: apply the deltas to
  `quire/spec/` and move this folder to `changes/archive/`.
