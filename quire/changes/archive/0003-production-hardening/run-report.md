---
change: 0003-production-hardening
run: 2026-10-16-01
agents: [claude-code/tier-A (coordinator, P00; workers P01, P02, P03, P05, P12, P13, P14, research), claude-code/tier-B (workers P04, P06, P07, P08, P09, P11), claude-code/tier-C (worker P10)]
result: complete
---

# Run report: Production hardening

## Execution

| Packet | Run by | Mode | Coordinator ran it |
| --- | --- | --- | --- |
| P00 integration (specs, schema version 2, contracts, stubs) | coordinator, tier A | sequential, first | yes (integration packet by design) |
| research: UX scorer | worker, tier A | parallel with P00 | no |
| P01 access | worker, tier A | wave 1 | partly: blocked on a step it did not own; the coordinator fixed the step (D-C-2) |
| P02 change sets, restore, compaction | worker, tier A | wave 1 | no |
| P05 rename | worker, tier A | wave 1 | no |
| P06 attachments: store, routes, file sync | worker, tier B | wave 1 | no |
| P10 logs, metrics, readiness | worker, tier C | wave 1 | no |
| P12 UX scorer and contrast | worker, tier A | started when P10 finished | no |
| P07 attachments in the app | worker, tier B | started when P06 finished | no |
| P03 backup bundles and restore | worker, tier A | wave 2 (after P02) | no |
| P04 vault history in the app | worker, tier B | wave 2 | partly: blocked on a harness timing gap; the coordinator changed the UI change-set gap (D-C-4) |
| P08 offline start | worker, tier B | wave 2 | no |
| P13 load of 32 devices | worker, tier A | after P01, P05, P06 | no |
| P11 container, Compose, uv | worker, tier B | after P01, P03, P10 | no |
| P09 first-load budget, App split | worker, tier B | after P04, P07, P08 | partly: its packet named a folder the structure rules refuse; the coordinator allowed it (D-C-6) |
| P14 every screen passes the UX gate | worker, tier A | last, alone | no |
| Verification and report | coordinator | sequential, last | yes |

## Usage

From `usage/ledger.csv` (`playbook/bin/usage.py report --change 0003-production-hardening`).
Numbers are the harness's per-worker reports; the coordinator's tokens are not reported per
slice; no credit figures were available. Wall minutes include waiting: P13 waited for a quiet
machine before its timed runs, P12 and P14 spent most of their time in the UX scorer.

| Scope | Model (alias, tier) | Total tokens | Wall minutes | Outcome |
| --- | --- | ---: | ---: | --- |
| research:ux-scorer | m1 (A) | 102,550 | 6.1 | design with sources |
| P01 | m1 (A) | 197,704 | 25.1 | 12/13, then 13/13 after D-C-2 |
| P02 | m1 (A) | 168,816 | 25.6 | 43/43 |
| P03 | m1 (A) | 195,756 | 17.2 | 29/30 (the one was P04's) |
| P04 | m2 (B) | 126,815 | 12.3 | blocked, then 1/1 after D-C-4 |
| P05 | m1 (A) | 186,175 | 25.4 | 28/28 |
| P06 | m2 (B) | 136,640 | 6.9 | 3/3 |
| P07 | m2 (B) | 174,900 | 17.0 | 19/19 |
| P08 | m2 (B) | 99,828 | 24.1 | 1/1 |
| P09 | m2 (B) | 205,685 | 47.6 | first load 435 to 183 kB gzip |
| P10 | m3 (C) | 151,715 | 6.3 | 22/22 |
| P11 | m2 (B) | 136,750 | 11.2 | deploy 1/1 |
| P12 | m1 (A) | 354,808 | 148.5 | scorer, contrast 180/180 |
| P13 | m1 (A) | 143,721 | 46.3 | 3/3 solo load runs |
| P14 | m1 (A) | 247,043 | 72.2 | UX gate 180/180, 129/129 |

| Tier | Slices | Total tokens | Wall minutes |
| --- | ---: | ---: | ---: |
| A | 8 (plus the coordinator, unreported) | 1,596,573 | 366.4 |
| B | 6 | 880,618 | 119.1 |
| C | 1 | 151,715 | 6.3 |

Workers' total: 2,628,906 tokens across 15 slices.

## Summary

- **Access** (P01): the server refuses to start without a token; named tokens for up to 32
  people or devices (`quire tokens add|list|revoke`), stored as hashes, compared in constant
  time, revocation closes live connections within 5 seconds; tokens only in headers, single-use
  tickets for event streams and live rooms; origin allow-list, CSP and other headers; size
  limits; throttling of failed token checks.
- **Versioning and backup** (P00, P02, P03, P04): schema versions with migrations and a copy
  first; change sets (bursts of work by one device); whole-vault restore to the end of any
  change set, itself undoable, in the API and the app; compaction that keeps the last
  revision per note per change set after 30 days and never drops heads, conflict revisions or
  unbacked revisions; chained, deduplicated, verified backup bundles built from change sets;
  `quire restore` rebuilds a server, optionally as of an earlier revision.
- **Rename** (P05): links in other notes follow a rename, keeping alias, heading and style; an
  offline edit to the old name lands on the new one; history follows. File tree Rename action
  (F2, pencil) by the coordinator.
- **Attachments** (P06, P07): files stored once by content hash in the same revision log,
  synced and cached for offline use; drop, paste or "Insert attachment" into the attachment
  folder; images in reading view and Live Preview; size limit with a message; file conflicts
  keep both copies.
- **Offline start** (P08): a service worker caches the app; "Reload to update" for new
  versions.
- **Budget** (P09): first-load JavaScript 435 kB to 183 kB gzip; graph, live editing, dialogs
  and drawers load on first use; `App.tsx` from 461 to 182 lines.
- **Operations** (P10, P11, P13): JSON request logs without secrets, Prometheus metrics,
  readiness; a non-root container image, Compose with `local` and `tls` profiles, uv for the
  Python tooling; 32 devices with 8 typing in one note: p95 push 128 to 234 ms, 0 errors.
- **UX** (P12, P14): a 0-100 scorer (accessibility, contrast, typography, interaction,
  structure, stability, consistency) with hard checks, floors and a baseline ratchet; every
  screen in every theme, light and dark, passes. Lowest state 75.9 to 90.0; every hard check
  180/180.

## I have some questions, but I proceeded with these recommendations

Kindly direct me if any of these were incorrect. Each one is reversible as noted.

| # | Question | What I did | Confidence | To reverse |
| --- | --- | --- | --- | --- |
| D-P11-4 | Who may reach the server? | Compose publishes it on `127.0.0.1` only; `QUIRE_BIND=0.0.0.0` (or the `tls` profile) serves the network | med | `QUIRE_BIND` default in `compose.yaml` |
| D-P11-3 | Trust `X-Forwarded-For`? | Only with `QUIRE_TRUST_PROXY=1`, which the TLS setup tells you to set; a default of 1 would let direct clients dodge the login throttle | med | default in `compose.yaml` |
| D-P01-4 | Content-Security-Policy | `img-src` allows `https:` (remote images in notes load, as in Obsidian); `connect-src` only the serving host, so a web app served by one server cannot talk to another | med | `access/guard.ts` |
| D-P01-8 | Revocation and open event streams | Revocation closes live rooms, not open event streams (they only carry commit notices; a new one needs a new ticket) | med | close streams in `live/events.ts` |
| D-P02-2 | Restoring when nothing would change | Answer 409 "the vault already matches change set N"; no empty change set | med | `backup/history/restore.ts` |
| D-P03-3 | Backup before a migration | `VACUUM INTO pre-migrate-v<from>-to-v<to>-<time>.db` in the backup folder (a bundle needs the new schema); the server refuses to start if the copy fails | med | `backup/bundles/migrate.ts` |
| D-P03-1 | Where a bundle's checksum lives | In its file name (`<seq>-<kind>-<sha256>.bundle.gz`), because gzip headers can change without failing decompression | med | a `.sha256` file beside each bundle |
| D-P03-5 | Tokens in backups | Every bundle carries the token table (hashes only), so tokens survive a restore | med | `backup/bundles/plan.ts` |
| D-P05-1 | Which links a rename rewrites | Every link that resolved before and would resolve elsewhere after, including the renamed note's own links; unresolved links are never touched | med | `packages/navigate/src/rename.ts` |
| D-P06-4 | Which files may be attached | Images, PDF, text/CSV/JSON/ZIP, Office documents, audio, video; HTML and `.md` refused; SVG served with a sandboxing CSP | med | MIME table in `packages/vault/src/files.ts` |
| D-P07-3 | Where a dropped file's embed goes | At the cursor, not the drop point | med | `vault/attachments/editor-extension.ts` |
| D-P08-1 | What the service worker caches | Every built file, including about 200 lazy code-block language chunks (about 2.5 MB) | med | filter in `platforms/offline/plugin.ts` |
| D-P09-2 | How far to lazy-load | Also the editor stack (`NoteView`), fetched at start beside the first render, to get under the budget | med | static imports in `App.tsx` |
| D-P12-5 | Faint text colour | One darker `--text-faint` for every theme, so faint text is now close to muted text in light themes | med | per-theme values in `styles.css` |
| D-P14-3 | Dialogs and drawers | Keyboard focus is trapped inside them; drawers are now modal for the keyboard | med | `shared/focus-trap.ts` |
| D-P14-4 | Narrow screens with the sidebar open | The page behind is inert; Escape closes the sidebar | med | `app/layout-state.ts`, `App.tsx` |
| D-P14-5 | A level-1 heading on every screen | The note title is an `<h1>`; reading view shows two `<h1>` when a note starts with `# ` | med | `vault/InlineTitle.tsx` |
| D-P14-6 | Graph labels | 16 px in the text colour (from 11 px muted): readable, but they overlap sooner in dense vaults | med | `navigate/graph/graph.css` |
| D-P12-10 / D-C-7 | The UX gate's run time | The R-PLT-08 scenario (about 6 minutes) runs in the `ux` gate, not in `scenarios`; the full matrix (about 10 minutes) too | med | drop the `@gate-ux` tag in the platforms spec |
| D-C-4 | Change-set gap in browser scenarios | 3 seconds on `@ui` scenarios (live rooms flush 1.5 s after typing), 1 second on `@system` | high | `scenarios/support/world.ts` |

Coordinator decisions (D-C):

- **D-C-1** (med): local nodes do not replicate attachments yet; they skip file heads so
  replication keeps working. Follow-up: teach `sync/replicator.ts` to move files.
- **D-C-2** (high): the live typing step drives browser devices too (it only drove system
  devices), which unblocked R-ACC-04.
- **D-C-3** (high): pushes go in batches under 1 MiB, and one note over the limit no longer
  blocks the rest (from D-P01-5: a large first sync would have failed forever).
- **D-C-5** (high): the store prepares each SQL statement once (P13's profile: the main
  server cost under load).
- **D-C-6** (med): `apps/web/src/app/` (the web shell) is allowed beside `shared` in
  `structure_allow`; the packet named it, the structure rules refused it.
- **D-C-9** (high): a real defect in live editing, found by repeated runs. When a note opened,
  the live room joined after a sync; the merge base for text typed during the join was the
  editor text after the sync, but the room was seeded from the server head, which could be
  older. Typing that landed between the push and the room connecting therefore equalled the
  base and was replaced by the older head: the text vanished. P09's lazy loading of the live
  libraries widened the window. The base is now the server text the sync agreed on
  (`apps/web/src/live/live.ts`), which is correct whatever the timing.
- **D-C-8** (high): file tree Rename action (F2 or the pencil button) and the "Insert
  attachment" command; `GET /api/docs?kind=file` lists attachment heads; file conflicts are
  announced as events.

## Blocked or skipped

Nothing is left blocked. Three packets were blocked once by coordinator gaps (P01 by a step,
P04 by scenario timing, P09 by a structure rule) and unblocked as recorded above.

Known gaps carried forward (not regressions):

- Local nodes replicate notes but not attachments (D-C-1), and send renames upstream as a
  create plus a delete, so cloud history does not follow a rename made on a local node
  (D-P05-7).
- Open event streams survive a token revocation (D-P01-8); live-room edits are not capped at
  the note size limit.
- `shared/http.ts` writes unexpected errors as plain text to stderr, not as JSON lines.
- No CI pipeline and no Android build (out of scope by the owner's choice).

## Verification

Final runs on the merged tree, no workers running (`playbook/bin/gate.sh`):

- `check`: green (types, dependency rules, structure: 0 violations, 5 soft size warnings).
- `scenarios`: 129 of 129 (2.8 min); 131 scenarios exist, the other two run in `deploy` and
  `ux`.
- `deploy`: 1 of 1 (image build, Compose up, healthy, non-root, data survives a restart).
- `ux`: R-PLT-08 passes (6.0 min); the full matrix, 180 states, passes with no regression
  against the approved baseline (10.0 min).
- The first full run had one failure (R-PLT-03), and a repeated run of every browser
  scenario under load (4 workers, twice) reproduced the same symptom elsewhere about once in
  100 runs: text typed into a note right after it was created vanished. Root cause in
  D-C-9; after the fix, every browser and live scenario passed 228 of 228 (two repeated
  runs), then `scenarios` 129 of 129 again.

## Playbook friction

- **Packets named paths the rules refuse.** P09's packet asked for `apps/web/src/app/`;
  structure rule S2 refused it. Folded into amendment 0008 (`structure_allow` may name an
  app shell). Lesson for packet authors: run `check` against the paths a packet creates.
- **Harness timing differs by layer.** A 1 second change-set gap was right for `@system`
  scenarios and wrong for `@ui` ones (live rooms flush after 1.5 s). The harness now sets it
  per layer.
- **Long gates.** The UX gate takes minutes; running it inside `scenarios` would have
  tripled every packet's verification. Amendment 0008 names such gates separately.
- **Shared machine.** Five to six workers on 4 cores made timing scenarios unreliable; the
  load packet waited for a quiet machine. Plan timing-sensitive packets for the end of a run.

## Spec drift

R-BAK-07's scenario waits 4 seconds instead of 2 (D-C-4). R-PLT-08's scenario carries the
`@gate-ux` tag. Everything else ran unchanged from the deltas.
