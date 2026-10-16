---
# Machine-readable header. Agents read this block; keep keys stable.
id: notion
name: Notion
role: primary
review_cadence: monthly
source: closed
license: proprietary
included_on: 2026-10-16
last_reviewed: 2026-10-16
upstream: []
---

# Notion

## Why it is in the set

Notion defines what users of a modern notes and docs tool expect from content
blocks and page features: the slash menu, toggles, callouts, inline databases
with several views, synced blocks, backlinks, comments and templates. It
answers the question "which widgets and page features does Quire need for a
user coming from Notion or Confluence to feel at home, and which of them can a
plain Markdown file actually hold?"

## How we use it

- **Role:** primary target for block and widget parity, trimmed. When deciding
  which blocks, views and page features Quire offers, start from Notion's set
  (`product/features.md`), keep only what maps to Markdown (MD? `yes` or
  `partial` with a clean convention), and use the Obsidian baseline for the
  syntax and default behaviour.
- **Review cadence:** monthly, against https://www.notion.com/releases. Review
  early when Notion ships a new block type, a database view, a change to
  offline mode or conflict handling, or a change to Markdown export or the
  Markdown Content API.
- **Borrow:**
  - Slash menu as the single insert surface, with search and greyed online-only
    items (NOT-UX-02, NOT-F-029).
  - Markdown typing shortcuts and the `⋮⋮` block handle with Turn into, drag to
    reorder and keyboard block moves (NOT-F-030, NOT-F-031).
  - Core block set: headings H1 to H4, lists, to-dos, toggles, callouts,
    quotes, dividers, code with Mermaid, equations, simple tables, images and
    file embeds, table of contents (NOT-F-001 to NOT-F-013, NOT-F-021,
    NOT-F-022, NOT-F-025).
  - Inline databases as notes plus frontmatter, with table, board and calendar
    views, filters, sorts and groups (NOT-F-044, NOT-F-046, NOT-F-051 to
    NOT-F-053, NOT-F-059).
  - `[[` and `@` linking with rename-safe links and backlinks (NOT-F-067,
    NOT-F-069).
  - Page and database templates as Markdown files (NOT-F-080).
  - Inline comments anchored to text, stored outside the Markdown
    (NOT-F-075).
  - Version history, trash and archive as recovery paths (NOT-F-039 to
    NOT-F-041).
  - Notion's documented offline merge rule as a minimum: text merges, single
    value fields keep one change (NOT-F-093).
- **Reject:**
  - Proprietary block JSON storage: Quire stores plain Markdown files, so the
    file is the source of truth.
  - Arbitrary nesting of any block under any block: Markdown only nests list
    items; allowing it would force a custom dialect.
  - Columns, tabs block, merged table cells and colored text: no Markdown form;
    they would need Notion-style XML tags.
  - Editable synced blocks: Quire offers read-only transclusion
    (`![[Note#^id]]`) instead.
  - Per-page, per-device offline downloads and the 50-row database limit:
    Quire's Android app syncs the whole vault offline.
  - Notion AI, Agents, Custom Agents, AI Meeting Notes and Enterprise Search:
    heavy service surface outside a lean editor.
  - Notion Mail and Notion Calendar: separate products.
  - Buttons, database automations, forms and synced external databases: need
    a server runtime and do not live in files.
  - Row and column permissions, guests and "Can create" access: Quire keeps
    permissions coarse (vault or folder level) on the server.
  - Notion Sites, Marketplace and the developer platform (Workers, CLI, Agent
    SDK): out of scope for a notes app.
  - Remapping `>` to toggle: Quire keeps `>` as a blockquote so typing round
    trips.

## Product definition

| File | Contents |
| --- | --- |
| `product/features.md` | Feature inventory, grouped, with IDs (`NOT-F-###`) |
| `product/ux-principles.md` | Interaction and design principles, with IDs (`NOT-UX-##`) |
| `product/data-model.md` | Storage format, document model, sync model |
| `product/visuals/README.md` | What to capture and where (captures are gitignored) |

## Upstream (open source only)

Not applicable: Notion is closed source. Track changes through
https://www.notion.com/releases, the Help Center (https://www.notion.com/help)
and the developer changelog (https://developers.notion.com).

## Review log

| Date | Reviewer | Upstream rev | Notes |
| --- | --- | --- | --- |
| 2026-10-16 | Claude (agent) | n/a | Initial inclusion; releases reviewed through 3.8 (2026-10-13) |
