---
# Machine-readable header. Agents read this block; keep keys stable.
id: confluence
name: Confluence (Cloud)
role: secondary
review_cadence: quarterly
source: closed
license: proprietary
included_on: 2026-10-16
last_reviewed: 2026-10-16
upstream: []
---

# Confluence (Cloud)

## Why it is in the set

Confluence is the reference for structured team documentation. It answers: what does a team wiki need beyond a personal notes vault (spaces, a shared page tree, version history with compare and restore, inline and page comments, templates, a small set of semantic blocks, labels, permissions, a publish step), and which of those can Quire deliver while keeping plain Markdown files as the only storage. It is also the reference for how a mature product presents version comparison and offline conflict resolution, which informs Quire's merge-conflict review UI.

## How we use it

- **Role:** secondary. Obsidian defaults stay the baseline. Confluence is consulted when Quire adds team features (shared tree, history, comments, templates, publishing) and when deciding which Confluence widgets have a Markdown form worth supporting. It never overrides a baseline default on file format or editing behaviour.
- **Review cadence:** quarterly, against the Atlassian "What's new" page and the Confluence Cloud help center. Review early when Quire starts work on history/diff, comments, permissions or import, or when Atlassian changes the editor, offline mode or export formats (for example the XML export end of life on 2026-12-01).
- **Borrow:**
  - Space as a top-level container with an overview page, mapped to a top-level folder with `index.md` (CNF-F-041, CNF-F-043).
  - Page tree with pages that can also be parents, plus passive folders; drag to reorder (CNF-F-044 to CNF-F-046).
  - Version history list with author, date and version comment (CNF-F-057, CNF-F-058).
  - Compare two selected versions with unchanged sections collapsed (CNF-F-059).
  - Non-destructive restore: the old version becomes the newest version, nothing after it is lost (CNF-F-060).
  - Unpublished changes view with "View changes" diff and revert, as the model for "local edits versus last synced" (CNF-F-063).
  - Time-coalesced versions for autosaved docs (live docs finalise a version 10 to 15 minutes after the last edit) (CNF-F-065).
  - Offline conflict review with three explicit choices: keep mine, keep theirs, combine manually (CNF-F-114).
  - Inline comments anchored to text, with threaded replies and resolve/reopen, stored outside the Markdown body (CNF-F-071, CNF-F-073).
  - The five panel types as callouts, expand as `<details>` or foldable callout, decision and action items (CNF-F-009, CNF-F-010, CNF-F-013, CNF-F-014).
  - Templates folder with a gallery, and simple variables (CNF-F-081, CNF-F-084, CNF-F-085).
  - Labels as tags, with a tag view and filtered search (CNF-F-088 to CNF-F-090).
  - Transclusion for reuse (include page, excerpt, synced block) via Obsidian embeds (CNF-F-028 to CNF-F-030).
  - Markdown autoformat and a single slash insert menu (CNF-F-002, CNF-F-003).
- **Reject:**
  - The macro zoo beyond a handful (keep TOC, children list, include/embed, task list query): most macros need server data and do not render on mobile (CNF-F-034, CNF-F-117).
  - Storage-format XHTML and ADF JSON as storage: Markdown is the format; these exist only as import sources (CNF-F-119).
  - Heavyweight permission matrices for the MVP (roles, granular space permissions, page restrictions, additive access): one role per space (read or write) is enough to start (CNF-F-096 to CNF-F-099).
  - Deleting individual versions with renumbering: history should be append-only (CNF-F-061).
  - Mandatory publish step for every page: Obsidian-style autosave is the default; publish is optional per space or note (CNF-F-062, CNF-F-070).
  - Multi-column layouts: no Markdown form and poor on mobile (CNF-F-021).
  - Online-only creation and expiring offline data: Quire files live locally and can be created offline (CNF-F-115).
  - Free text color and 20 panel background colors: not representable without HTML noise (CNF-F-007, CNF-F-013).
  - Databases, whiteboards and slides as built-in content types for the MVP: separate formats with their own history rules (CNF-F-092 to CNF-F-095).
  - Rovo-style AI features, reactions, analytics and watch notifications in the MVP: server features outside the file model (CNF-F-077, CNF-F-078, CNF-F-080, CNF-F-124 to CNF-F-129).

## Product definition

| File | Contents |
| --- | --- |
| `product/features.md` | Feature inventory, grouped, with IDs (`CNF-F-###`) |
| `product/ux-principles.md` | Interaction and design principles, with IDs (`CNF-UX-##`) |
| `product/data-model.md` | Storage format, document model, sync model |
| `product/visuals/README.md` | What to capture and where (captures are gitignored) |

## Upstream (open source only)

Not applicable. Confluence Cloud is closed source; there is no upstream copy. Product facts come from support.atlassian.com, atlassian.com and developer.atlassian.com, listed in each product file.

## Review log

| Date | Reviewer | Upstream rev | Notes |
| --- | --- | --- | --- |
| 2026-10-16 | Claude (agent) | n/a | Initial inclusion |
