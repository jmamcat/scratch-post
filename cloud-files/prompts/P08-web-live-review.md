You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0001-mvp-foundation
Your packet: quire/changes/0001-mvp-foundation/packets/P08-web-live-review.md

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
id: 0001-mvp-foundation/P08
title: Live editing, review inbox and version history in the web client
lane: D
depends_on: [P05, P07]
owns:
  - quire/apps/web/src/live/**
  - quire/apps/web/src/review/**
  - quire/apps/web/src/history/**
reads:
  - quire/apps/web/src/**
  - quire/changes/0001-mvp-foundation/spec/review/spec.md
  - quire/changes/0001-mvp-foundation/spec/live/spec.md
  - references/confluence/product/ux-principles.md
size: M
status: todo
---

# Live editing, review inbox and history

## Context

Implements R-LIV-05, R-RVW-02..07, R-VLT-06 (UI). Uses `y-websocket` and
`y-codemirror.next`.

## Contract

- Live: when online, the open note joins `/live?path=` and binds CodeMirror to
  `Y.Text("content")`; `SyncClient.setLive(path, true)` while connected. On disconnect,
  unbind, mark not live, keep the editor content as the local text. On reconnect, sync
  first, then rejoin. Remote cursors via awareness (name = device).
- Review inbox: drawer opened from the status-bar badge. Open conflicts first, then
  "Review suggested". Card: path, "<current device> · <time>" vs "<incoming device> · <time>",
  each hunk side by side with Keep current / Keep incoming / Keep both / Edit; record-level
  Keep all current / Keep all incoming; Apply. Review items: Accept / Change.
  Delete-edit: Keep note / Delete note.
- Banner on a note with an open conflict: "This note has unresolved changes from <device>. Review".
- History drawer (command "Show version history"): revisions newest first with device and
  time, preview in reading view, Restore.

## Acceptance

```sh
pnpm -C quire --filter @quire/web typecheck
pnpm -C quire --filter @quire/web build
```

## Decisions log
