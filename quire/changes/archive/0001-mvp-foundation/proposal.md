---
id: 0001-mvp-foundation
play: new-system
status: archived
created: 2026-10-16
references: [obsidian, notion, confluence, joplin, silverbullet]
capabilities: [vault, render, navigate, merge, sync, review, live, platforms]
---

# MVP foundation

## Why

Quire needs a working vertical slice before features can be added safely: Markdown
storage, an Obsidian-compatible renderer, a client that works offline, and a sync path
that never loses an edit. Everything later (databases, templates, embeds, canvas) builds
on these contracts.

## Headline scenarios

- Two devices edit different paragraphs of one note offline; both edits survive (R-SYN-03).
- A true collision waits in the review inbox with both versions until someone picks (R-RVW-03).
- The vault folder opens in Obsidian, and edits made there show up in the app (R-VLT-05).
- A local node keeps serving while the cloud is down and catches up after (R-SYN-09).

## What changes

- New pnpm workspace in `quire/` with capability packages `@quire/vault`, `@quire/render`,
  `@quire/navigate`, `@quire/merge`, `@quire/sync`, and apps `@quire/server`, `@quire/web`,
  `@quire/android` (split from an initial `@quire/core` during the run).
- Obsidian Flavored Markdown rendering with wikilinks, embeds, callouts, highlights,
  tags, footnotes and task lists; raw HTML escaped.
- A three-way merge engine with front matter merged per property and five collision tiers.
- A server with an append-only revision log, a disk mirror that Obsidian can open,
  sync push/pull, conflict records, version history, an event stream and Yjs live rooms.
- A local node mode that replicates with a cloud server and keeps working when it is down.
- A local-first web client with the Obsidian default layout, offline search and backlinks,
  a review inbox for collisions, and version history.
- A Capacitor Android wrapper (scaffold; APK build needs the Android SDK).

## Reference grounding

See `references/feature-matrix.md`, rows marked `0001`. In short: Obsidian supplies
the defaults and the syntax; Notion and Confluence supply the parity targets for
callouts, toggles, page history and co-editing; Joplin supplies the offline/sync
architecture lessons (and the conflict UX we improve on); SilverBullet is tracked for
its offline PWA approach.

## Out of scope

Databases and Bases views, Canvas, slash menu, templates, note transclusion, file
attachments upload, plugins, end-to-end encryption, sharing and permissions, rename
tracking, PWA install manifest.

## Impact

New code only. No existing code in the repository changes.
