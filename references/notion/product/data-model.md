# Notion: data model, sync and export

How Notion models and moves content, as publicly documented on 2026-10-16.
Notion is closed source; everything here comes from the Help Center, the
developer docs, release notes and the engineering blog (Sources at the bottom).
Anything inferred is marked "(unverified)".

## 1. Storage format

- Content is stored as records in Notion's cloud database, not as files. The
  public representation is the block JSON of the REST API. There is no
  user-visible file per page.
- Local clients keep a SQLite cache; with offline mode (August 2025) it became
  a persistent store for pages marked offline (see section 6).
- Markdown appears only at the edges: import, export, and the Markdown Content
  API (2026), which needs its own dialect for Notion-only blocks.

## 2. Blocks

Every piece of content is a block, and every page is a stack of blocks. API
block object fields:

| Field | Meaning |
| --- | --- |
| `id` | UUID |
| `parent` | Page, block, data source or workspace that contains it |
| `type` | Block type; type-specific data sits under a key of the same name |
| `has_children` | Whether nested blocks exist (fetched separately) |
| `created_time`, `last_edited_time` | ISO 8601 timestamps |
| `created_by`, `last_edited_by` | Partial user objects |
| `in_trash` | Trashed flag (`archived` is a deprecated alias) |

Block types in the API: paragraph, heading_1 to heading_4, bulleted_list_item,
numbered_list_item, to_do, toggle, quote, callout, divider, code, equation,
table, table_row, column_list, column, image, video, audio, file, pdf,
bookmark, embed, link_preview (read only), breadcrumb, table_of_contents,
synced_block, child_page, child_database, tab, meeting_notes (formerly
transcription), template (deprecated). Forms, buttons and some newer blocks
return `type: "unsupported"`.

Children: lists, to-dos, toggles, quotes, callouts, paragraphs, columns,
synced blocks, tables and toggleable headings can contain child blocks. Any
block can be nested under another with `tab`, which is the main structural
mismatch with Markdown, where only list items nest.

Inline content is an array of rich text objects. Each carries annotations
(bold, italic, strikethrough, underline, code, color) and may be a mention
(user, page, database, date, link preview, template placeholder) or an inline
equation.

## 3. Pages

- A page is a block with a title, optional icon and cover, and a parent
  (workspace, page or data source).
- A page in a database has property values that match the data source schema.
- Pages nest inside pages; the sidebar tree is the page tree.
- Backlinks are computed from page mentions and shown above the title.

## 4. Databases, data sources and properties

- Since API version 2025-09-03 a **database** is a container (parent, title,
  icon, cover, inline flag) holding one or more **data sources**. Each data
  source has its own schema (`properties`). Rows are pages whose parent is a
  data source. Relations and page creation reference `data_source_id`.
- **Property types:** Text, Number, Select, Status, Multi-select, Date,
  Formula, Relation, Rollup, Person, Files & media, Checkbox, URL, Email,
  Phone, Created time, Created by, Last edited time, Last edited by, Button,
  ID, Place.
- **Views** (table, board, timeline, calendar, list, gallery, chart, feed,
  map, dashboard, form) are stored per database with their own filters, sorts
  and groups. A linked view shows an existing database on another page.
- Formula and rollup values are computed by Notion; relations can be two-way.
- Database restores from version history bring back pages and properties but
  not the text inside those pages.

## 5. Permissions

| Level | Scope |
| --- | --- |
| Full access | Edit and share |
| Can edit | Edit content, cannot share |
| Can edit content | Databases: edit rows and values, not structure, views, sorts or filters |
| Can create | Databases (Business and Enterprise): add rows without seeing others |
| Can comment | Comment only |
| Can view | Read only |

- Subpages inherit permissions from the parent page and can override them.
- Teamspaces have members and default permissions for new pages.
- Guests are external accounts invited by email.
- General access: "Only people invited", "Everyone at {workspace}", "Anyone on
  the web with link" (links can expire; Enterprise can disable public links).
- Database row permissions (3.0, September 2025, Business and Enterprise) and
  column permissions (3.8, October 2026) add per-row and per-property access.
- Synced blocks take their access from the page that holds the original.
- Version history retention by plan: Free 7 days, Plus 30, Business 90,
  Enterprise configurable. Versions are captured every 10 minutes during
  editing plus once 2 minutes after the last edit. Trash keeps pages 30 days.

## 6. Offline mode and sync

Shipped in Notion 2.53 (2025-08-19). Documented behaviour:

- **Platforms:** desktop and mobile apps only. "This feature isn't available
  on web browsers." All plans can use it.
- **What is offline:** only pages that are downloaded. A user toggles
  "Available offline" in the `•••` menu per page and per device. Subpages are
  not downloaded automatically. Plus, Business and Enterprise auto-download
  Recents and Favorites (can be turned off). Settings > Offline lists and
  removes downloaded pages.
- **Databases:** downloading a database, or a page that contains one, includes
  the first 50 rows of the first view. Further rows must be downloaded one by
  one.
- **Editing offline:** view, edit and create pages. Embeds, AI blocks, forms
  and buttons do not work offline and show as unavailable in the slash menu.
  Sharing and permission changes are blocked.
- **Sync:** downloaded pages update in the background. The server pushes a
  notification on a per-page channel when updates are applied; on reconnect the
  client compares its last-downloaded timestamp with the server's last-updated
  time and refetches newer pages.
- **Client storage:** the SQLite cache became persistent. An `offline_page`
  table holds pages kept offline and an `offline_action` table records each
  reason (manual toggle, favorite, inherited from parent); a page leaves the
  set when its last reason is removed.
- **Conflicts:** pages marked offline are migrated to a CRDT data model.
  Notion "tries to resolve conflicting text edits automatically". Non-text
  edits carry more risk: if two people change the same select property
  offline, only one change is saved. The guide adds that non-text changes such
  as images "sometimes" need a quick review.
- **Not documented:** no conflict copies, no conflict-resolution UI, no
  description of an offline status indicator, and no storage quota are
  described on official pages. Third-party posts disagree (some claim conflict
  banners or duplicated blocks, one claims silently dropped edits); treat all
  of these as (unverified).

## 7. Export formats and fidelity

| Format | Scope | Notes |
| --- | --- | --- |
| Markdown & CSV | Page, database, or whole workspace | Pages become `.md`; full-page databases become CSV plus one `.md` per row; files exported alongside |
| HTML | Page, database, or workspace | Each page a file in its own folder; can include resolved and unresolved comments |
| PDF | Page or database | Subpages only on Business and Enterprise; custom emoji dropped; falls back to HTML on failure |
| Workspace export | Settings > General | HTML or Markdown & CSV; emailed link valid 7 days; can take up to 30 hours |
| Admin API export | Enterprise (beta) | Scheduled or scripted exports |

Documented losses:

- Callout blocks are exported as HTML because Markdown has no equivalent.
- Form views cannot be exported.
- Only the current view or the default view of a database is exported, not all
  views.
- Pages the exporter cannot access (other users' private pages, some
  teamspace content) are left out.
- Re-importing an export does not rebuild the workspace.
- Deep subpage folders can exceed the Windows 260-character path limit.

Losses inferred from the format, not stated by Notion (unverified):

- Toggles, columns, tabs, synced blocks, buttons, embeds and colors have no
  CommonMark form and are flattened, converted to plain blocks or dropped.
- Mentions and page links become ordinary links or plain text; file names and
  links carry Notion page IDs.
- Comments are not in the Markdown output (the export page only documents
  comments for HTML).
- CSV holds displayed values: relations, people and rollups appear as text,
  formulas as computed values; view definitions, filters and layouts are lost.
- Block IDs are lost, so block links break.

Markdown Content API dialect (2026): Notion's own "Notion-flavored Markdown"
(v2 preview) expresses non-CommonMark blocks with XML-like tags such as
`<toggle>`, `<callout icon color>`, `<columns><column ratio>`, `<mention>`,
`<date>`, `<synced-block>`, `<page>` and `<database>`, and color spans. Blocks
it cannot express (bookmark, embed, link preview, breadcrumb, template) come
back as `<unknown>`. Pages above roughly 20,000 blocks are truncated.

## 8. Implications for Quire

- Notion needs a custom dialect to say what its blocks mean; Quire should limit
  its block set to what CommonMark, GFM and Obsidian-flavored Markdown can
  store (callouts as `> [!type]`, toggles as foldable callouts, embeds as
  `![[...]]`).
- Databases map to folders of notes with frontmatter plus a view file; computed
  values (formulas, rollups) are never written into notes.
- Comments, permissions and history are server-side sidecars, keyed by file
  path and text anchor, so the Markdown stays portable.
- Offline: whole-vault sync on Android removes Notion's 50-row and per-page
  limits. Notion's documented rule (text merges, single-value fields keep one
  change) is a reasonable minimum: merge Markdown bodies at the text level and
  resolve frontmatter per key.

## Sources

- https://www.notion.com/help/what-is-a-block
- https://www.notion.com/help/database-properties
- https://www.notion.com/help/views-filters-and-sorts
- https://www.notion.com/help/sharing-and-permissions
- https://www.notion.com/help/synced-blocks
- https://www.notion.com/help/duplicate-delete-and-restore-content
- https://www.notion.com/help/use-pages-offline
- https://www.notion.com/help/guides/working-offline-in-notion-everything-you-need-to-know
- https://www.notion.com/help/export-your-content
- https://www.notion.com/help/import-data-into-notion
- https://www.notion.com/blog/how-we-made-notion-available-offline
- https://www.notion.com/releases/2025-08-19
- https://www.notion.com/releases/2025-09-18
- https://www.notion.com/releases/2026-10-13
- https://developers.notion.com/reference/block
- https://developers.notion.com/reference/rich-text
- https://developers.notion.com/docs/upgrade-guide-2025-09-03
- https://developers.notion.com/guides/data-apis/working-with-markdown-content
- https://developers.notion.com/guides/data-apis/notion-flavored-markdown
