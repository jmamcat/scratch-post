# Notion: UX principles

Interaction principles observed in Notion as of 2026-10-16, with IDs
(`NOT-UX-##`). Each entry gives the principle, how Notion expresses it, and a
one-line takeaway for Quire (lean, Markdown files as storage). Feature IDs refer
to `features.md`.

## NOT-UX-01 Everything is a block

- **Principle:** One uniform content unit, so every piece of content can be
  moved, converted, commented on and linked the same way.
- **Notion:** "Every page is a stack of blocks"; any block can be turned into
  any other type through the `⋮⋮` menu or `cmd/ctrl+option/shift+number`
  (NOT-F-031). Pages themselves are blocks (`child_page` in the API).
- **Quire takeaway:** Treat each top-level Markdown construct (paragraph, list
  item, heading, fence, callout) as an addressable block in the editor, while
  the file stays plain Markdown.

## NOT-UX-02 One insertion entry point

- **Principle:** A single, searchable command surface for adding anything, so
  users never hunt through toolbars.
- **Notion:** `/` opens the slash menu for blocks, actions (`/delete`,
  `/duplicate`) and colors (`/red`); `+` on hover and on mobile opens the same
  list; offline, unavailable items are greyed out (NOT-F-029, NOT-F-094).
- **Quire takeaway:** Ship a slash menu as the primary insert UI, filter it by
  what the current Markdown dialect can store, and grey out online-only items.

## NOT-UX-03 Markdown shortcuts as accelerators, not as the model

- **Principle:** Let people type familiar syntax, but convert it immediately
  into rich blocks.
- **Notion:** `#`, `-`, `[]`, `---`, `**`, `` ` `` convert as you type
  (NOT-F-030). The mapping diverges from Markdown: `>` plus space makes a
  toggle and `"` plus space makes a quote.
- **Quire takeaway:** Keep the same typing shortcuts but make them round-trip
  exactly (`>` stays a blockquote); never invent a shortcut whose output is not
  the Markdown the user typed.

## NOT-UX-04 Direct manipulation of structure

- **Principle:** Rearrange content by dragging, with visible drop guides,
  instead of cut and paste.
- **Notion:** The `⋮⋮` drag handle moves blocks, table rows and cards; dropping
  beside a block creates columns with blue guides; sidebar pages are dragged to
  nest (NOT-F-015, NOT-F-031, NOT-F-036).
- **Quire takeaway:** Support drag to reorder blocks and files; skip
  drag-to-create-columns because columns have no Markdown form.

## NOT-UX-05 Quiet canvas, progressive disclosure

- **Principle:** The page looks like a clean document until you hover or
  select; controls appear where the cursor is.
- **Notion:** `⋮⋮` and `+` appear on hover; "Add icon", "Add cover" and
  "Add comment" appear above the title on hover (icon and cover placement
  unverified); the selection toolbar appears on highlight. On mobile, where there is no hover, `•••` and `+` are always
  visible and a toolbar sits above the keyboard (NOT-F-096).
- **Quire takeaway:** Hide block chrome until hover or focus on desktop; give
  touch a persistent keyboard toolbar instead of hover affordances.

## NOT-UX-06 Pages are documents and containers

- **Principle:** Hierarchy is created by writing, not by managing folders.
- **Notion:** Any page can hold subpages, and the sidebar tree mirrors that
  nesting under Teamspaces, Shared and Private (NOT-F-035, NOT-F-036).
- **Quire takeaway:** Adopt the folder-note convention (`Topic.md` next to
  `Topic/`) so a note can have children without a separate folder concept in
  the UI.

## NOT-UX-07 Structured data lives inside documents

- **Principle:** Tables of records sit inline next to prose, and one dataset can
  be shown many ways.
- **Notion:** Inline and full-page databases; table, board, calendar, timeline,
  gallery, chart, feed, map and dashboard views over the same rows; linked views
  of one database on many pages (NOT-F-044, NOT-F-051 to NOT-F-060).
- **Quire takeaway:** Rows are notes with frontmatter, views are a separate view
  file embedded in a page; start with table, board and calendar.

## NOT-UX-08 Linking is cheap and bidirectional

- **Principle:** Linking should cost one keystroke, and the target should know
  who links to it.
- **Notion:** `@`, `[[` and `+` insert page links whose labels update on
  rename; backlinks appear above the title (NOT-F-067, NOT-F-069).
- **Quire takeaway:** Use Obsidian `[[wikilinks]]` with rename-safe link
  rewriting and a backlinks panel; this is already the baseline.

## NOT-UX-09 Reuse instead of copy

- **Principle:** Content that repeats should have one source.
- **Notion:** Synced blocks (edit anywhere, labelled ORIGINAL), database
  templates, repeating templates and buttons that insert blocks (NOT-F-026,
  NOT-F-027, NOT-F-080, NOT-F-081).
- **Quire takeaway:** Offer read-only transclusion (`![[Note#^id]]`) and file
  templates; do not try to make transcluded copies editable in place.

## NOT-UX-10 Same verbs on every object

- **Principle:** Predictable menus: the same actions in the same place for every
  block, page and database.
- **Notion:** The `⋮⋮` block menu (Turn into, Color, Copy link to block,
  Duplicate, Move to, Delete, Comment) and the `•••` page menu (export,
  Available offline, Archive, version history) behave consistently.
- **Quire takeaway:** Define one block menu and one note menu and keep their
  verb lists short and identical across web and Android.

## NOT-UX-11 Collaboration in context

- **Principle:** Discussion and review happen on the content, not in a separate
  tool.
- **Notion:** Inline comments anchored to text or blocks, a comments pane and a
  discussions view, suggested edits that owners accept or reject, `@` mentions
  that land in the inbox (NOT-F-075, NOT-F-076, NOT-F-079).
- **Quire takeaway:** Anchor comments to text ranges in a sidecar file so the
  Markdown stays clean; defer suggested edits.

## NOT-UX-12 Keyboard parity for power users

- **Principle:** Everything the mouse does, the keyboard can do.
- **Notion:** `esc` selects the current block, `cmd/ctrl+/` opens actions on
  selected blocks, `cmd/ctrl+shift+arrows` moves blocks, `cmd/ctrl+D`
  duplicates, `tab` nests, `cmd/ctrl+P` searches (NOT-F-031, NOT-F-072).
- **Quire takeaway:** Copy this shortcut set where Obsidian has no conflicting
  default; Obsidian defaults win on conflict.

## NOT-UX-13 Offline is opt-in and per page

- **Principle:** Notion is cloud-first; offline is an explicit, per-device,
  per-page choice.
- **Notion:** "Available offline" toggle in the `•••` menu, subpages not
  included, first 50 database rows only, auto-download of Recents and Favorites
  on paid plans, a Settings > Offline dashboard (NOT-F-090 to NOT-F-092).
- **Quire takeaway:** Invert it: local files make everything offline by
  default on Android; only surface what is online-only.

## NOT-UX-14 Never start from a blank page

- **Principle:** Starter structure lowers the cost of a first page or database.
- **Notion:** Template gallery, one-click setups for task trackers and meeting
  notes, database templates chosen from the `New` dropdown (NOT-F-080,
  NOT-F-082).
- **Quire takeaway:** Ship a handful of starter folders (tasks, meeting notes,
  wiki) as plain Markdown plus view files.

## NOT-UX-15 Recoverable by default

- **Principle:** Users experiment freely when nothing is lost.
- **Notion:** Version history every 10 minutes with named versions and
  attribution, 30-day trash, and Archive as a softer alternative to delete
  (NOT-F-039 to NOT-F-041).
- **Quire takeaway:** Keep server-side snapshots of every note and a trash
  folder; prefer `archived: true` over deletion for stale docs.

## Sources

- https://www.notion.com/help/what-is-a-block
- https://www.notion.com/help/writing-and-editing-basics
- https://www.notion.com/help/keyboard-shortcuts
- https://www.notion.com/help/columns-headings-and-dividers
- https://www.notion.com/help/notion-for-mobile
- https://www.notion.com/help/create-links-and-backlinks
- https://www.notion.com/help/synced-blocks
- https://www.notion.com/help/comments-mentions-and-reminders
- https://www.notion.com/help/use-pages-offline
- https://www.notion.com/help/duplicate-delete-and-restore-content
- https://www.notion.com/help/archive-pages
- https://www.notion.com/help/views-filters-and-sorts
