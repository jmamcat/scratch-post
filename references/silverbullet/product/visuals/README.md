# SilverBullet: visuals capture checklist

SilverBullet is open source (MIT). Screenshots may be captured, but they go in
`product/visuals/captures/`, which is gitignored (`references/*/product/visuals/captures/`
in the root `.gitignore`). Do not commit captures. Name files
`SB-<area>-<nn>-<client>.png` (for example `SB-conflict-01-pwa.png`).

Tracking reference: capture only what informs Quire's sync and conflict UX.

## How to get a running instance

- Install: https://docs.silverbullet.md/Install (single Rust binary or Docker image
  `zefhemel/silverbullet`), then open it in Chrome and install the PWA.
- Conflict scenario: open the same page in two browsers (or one PWA plus one private
  window), take one offline (DevTools, Network, Offline), edit the same words on both,
  reconnect.

## Capture list

| # | Area | What to capture | Official reference |
| --- | --- | --- | --- |
| 1 | PWA | Installed PWA window; offline indicator if any; editor with Live Preview | https://docs.silverbullet.md/PWA, `docs/pwa-screenshot.png` upstream |
| 2 | Sync status | Top Bar progress circle during a long sync | https://docs.silverbullet.md/Sync |
| 3 | Clean merge | Two offline edits to different words of the same line, after reconnect: merged text, no conflict | https://docs.silverbullet.md/Collaboration |
| 4 | Conflict widget | "edit conflict" widget: Version 1, Version 2, Original panels; "Accept both", "Edit manually", version choice, "Show comparison" | https://docs.silverbullet.md/Collaboration, `client/codemirror/syntax/conflict_markers.ts` |
| 5 | Raw markers | Same conflicted file opened in a plain text editor (shows `<<<<<<< SB sha256:` markers) | `server-merge/src/markers.rs` |
| 6 | Conflict notification | The UI notification raised on conflict and on suppressed deletion | https://docs.silverbullet.md/Collaboration |
| 7 | Binary conflict | `name.conflicted-<hash>.ext` sibling in the file tree | https://docs.silverbullet.md/Collaboration |
| 8 | Recovery | `Sync: Recover Stale Revision` picker | `client/editor_commands.ts` |
| 9 | Live external edit | Highlighted, author-labelled insertion arriving in an open page | https://docs.silverbullet.md/Collaboration |
| 10 | History | `Revision: Page History` diff view and Restore; `Revision: Space History` | https://docs.silverbullet.md/Revisions |
| 11 | Git conflicts | "Git: Review conflicts" page with keep this / keep remote / keep both / edit | https://docs.silverbullet.md/Revisions |
| 12 | Queries | A page with a SLIQ query rendering a table of tasks | https://docs.silverbullet.md/Space%20Lua/Integrated%20Query |
| 13 | Mobile | PWA on Android with the keyboard bar and navigator drawers | `docs/CHANGELOG.md` (2.12.0) |

## Upstream images already in the repo

- `docs/pwa-screenshot.png`
- `docs/demo-video-screenshot.png`
