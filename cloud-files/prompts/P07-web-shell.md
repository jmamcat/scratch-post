You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0001-mvp-foundation
Your packet: quire/changes/0001-mvp-foundation/packets/P07-web-shell.md

Rules (full text in method/run-protocol.md):
1. Set status: doing and claimed_by: <your harness>/<your model> in the packet front matter.
2. Edit only paths matching the packet's "owns" globs. You may read "reads" paths.
3. When something is unclear: follow the spec, then the baseline reference, then the
   simplest reversible option. Log each such call as a decision record in the packet.
4. Stop only for destructive actions outside "owns", secrets/credentials/payments, or
   license problems. Then set status: blocked with the reason.
5. Done means every Acceptance command exits 0. Paste a short result summary under
   Acceptance, then set status: done.
6. Never put model names in code or commit messages.

The packet follows.

---
id: 0001-mvp-foundation/P07
title: Local-first web client shell
lane: D
depends_on: [P01, P03]
owns:
  - quire/apps/web/**
reads:
  - quire/packages/**
  - quire/changes/0001-mvp-foundation/design.md
  - quire/changes/0001-mvp-foundation/spec/navigate/spec.md
  - quire/changes/0001-mvp-foundation/spec/sync/spec.md
  - references/obsidian/product/ux-principles.md
size: L
status: todo
---

# Web client shell

## Context

Implements R-SYN-01, R-NAV-01, R-NAV-04..07, R-RND (via `renderMarkdown`) and the
Settings part of R-PLT-03 with React, Vite and CodeMirror 6. Server routes and types are
in P03/P04 contracts. Split into sub-steps when working with a tier B or C model:
store + transport, layout + file tree, editor + preview, right pane, switcher + palette.

## Contract

- `src/store/idb.ts`: `IdbLocalStore implements LocalStore` (`idb`, database `quire`,
  stores `docs` keyed by path and `meta`).
- Transport: use `HttpTransport` from `@quire/sync` (already has `push`, `changes`,
  `doc`, `history`, `conflicts`, `resolve`, `dismiss`, `health`, and `url(path, params)`
  for EventSource/WebSocket URLs with the token). `src/store/events.ts` wraps
  `EventSource(transport.url('/api/events'))` and reconnects.
- `src/settings.ts`: `{ serverUrl, token, device }` in localStorage; default server URL
  is the page origin; device defaults to a random readable name.
- Layout: left file tree (folders from paths, new note, new folder by path prefix),
  centre editor (CodeMirror markdown source) with a Reading toggle (Ctrl/Cmd+E),
  right pane tabs Backlinks, Outgoing, Outline, Properties, status bar with sync state
  (Synced / Syncing / Offline / N pending) and a conflicts badge placeholder for P08.
- Routing by hash: `#/<path>`; internal links navigate; clicking an unresolved link
  creates the note.
- Quick switcher (Ctrl/Cmd+O), command palette (Ctrl/Cmd+P) with: New note, Open today's
  daily note, Toggle reading view, Delete note, Sync now, Open settings.

## Acceptance

```sh
pnpm -C quire --filter @quire/web typecheck
pnpm -C quire --filter @quire/web build
pnpm -C quire --filter @quire/web test
```

## Decisions log
