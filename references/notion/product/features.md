# Notion: feature inventory

Inventory of Notion features as of 2026-10-16, grouped by area. Each row has a
stable ID (`NOT-F-###`). IDs are never reused; retired features keep their row
with a note.

Column key:

- **MD?** Is the feature Markdown-representable? `yes` = plain CommonMark/GFM or
  Obsidian-flavored Markdown (OFM) covers it, or it is pure UI that produces
  standard Markdown. `partial` = representable with a convention (frontmatter,
  OFM syntax, sidecar file) or with loss. `no` = needs server state or an app
  feature outside the file.
- **Src** points to the numbered Sources list at the bottom.

## Editing & blocks

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-001 | Text block | Default paragraph block created when you start typing. | yes | Paragraph. | S53, S55 |
| NOT-F-002 | Headings H1 to H4 | Four heading levels; H4 added in 3.4 (March 2026). | yes | `#` to `####`. | S9, S81 |
| NOT-F-003 | Bulleted list | Bullets via `*`, `-` or `+` plus space. | yes | GFM list. | S55 |
| NOT-F-004 | Numbered list | Numbered via `1.`, `a.` or `i.` plus space. | partial | `1.` lists are standard; letter and roman styles have no CommonMark form and render as decimal. | S55 |
| NOT-F-005 | To-do list | Checkbox items via `[]`. | yes | `- [ ]` / `- [x]` (GFM task list). | S29, S55 |
| NOT-F-006 | Toggles and toggle headings | Collapsible block (or H1 to H3 heading) with a title line and nested children; `>` plus space creates a toggle list. | partial | OFM foldable callout `> [!note]-` or HTML `<details>`; heading fold state is view state only. Notion maps `>` to toggle, not quote. | S9, S29, S55, S96 |
| NOT-F-007 | Quote block | Block quote via `"` plus space. | yes | `>` blockquote. | S29, S55 |
| NOT-F-008 | Callout | Highlighted block with icon and color, can hold child blocks. | partial | OFM callout `> [!tip] Title`; icon and color map to callout type. Notion's own Markdown export writes callouts as HTML. | S19, S55, S96 |
| NOT-F-009 | Divider | Horizontal rule via `---`. | yes | `---`. | S9, S29 |
| NOT-F-010 | Code block | Language selection, syntax highlighting, wrap toggle, caption, copy button. | partial | Fenced code with info string; caption and wrap flag are lost. | S8 |
| NOT-F-011 | Mermaid diagrams | Code block in Mermaid language with Code, Preview and Split modes (unverified on official help). | yes | ` ```mermaid ` fenced block (Obsidian renders natively). | S8 |
| NOT-F-012 | Block and inline equations | KaTeX via `/math` for blocks and `$$...$$` typed inline or `ctrl/cmd+shift+E`; supports mhchem `\ce`, `\pu`. | yes | `$$` lines for blocks, `$...$` inline (OFM). | S34 |
| NOT-F-013 | Simple table | Grid of text cells with optional header row and column. | partial | GFM pipe table; header column, cell colors and multi-line cells are lost. | S55 |
| NOT-F-014 | Merge cells in simple tables | Merge selected cells for multi-column headers or grouped rows (May 2026). | no | GFM tables cannot merge; would need an HTML `<table>` fallback. | S90 |
| NOT-F-015 | Columns | Side-by-side layout created by dragging a block beside another; resizable; collapses to one column on phones. | partial | No CommonMark form. Notion's own Markdown API uses `<columns><column>` tags; Quire would need a container convention. | S9, S58 |
| NOT-F-016 | Tabs block | Split a page into clickable sections without subpages (`/tabs`, March 2026). | partial | Needs a container convention (one heading per tab inside a fenced block); degrades to sequential sections. | S81, S83 |
| NOT-F-017 | Inline formatting | Bold, italic, strikethrough, inline code, underline. | partial | All standard except underline, which needs HTML `<u>`. | S55 |
| NOT-F-018 | Text and background colors | Nine text colors and matching backgrounds per span or block. | partial | OFM `==highlight==` covers one color; others need HTML `<span>` or are dropped. | S55, S58 |
| NOT-F-019 | Page appearance | Emoji or image icon, cover image, Default/Serif/Mono font, small text, full width. | partial | Frontmatter keys `icon`, `cover`, Obsidian `cssclasses` (convention, not OFM core). | S12, S55 |
| NOT-F-020 | Emoji and custom emoji | Unicode emoji plus workspace custom emoji via `:name` or `/emoji`. | partial | Unicode yes; custom emoji need a shortcode convention plus asset file. | S55, S65 |
| NOT-F-021 | Images | Upload, resize, crop, caption and link an image. | partial | `![alt](path)` or OFM `![[img.png\|300]]` for width; crop and caption lost. | S25 |
| NOT-F-022 | Video, audio, file and PDF blocks | Uploaded or linked media with inline players and PDF viewer. | partial | OFM embeds `![[file.pdf]]`, `![[clip.mp3]]`. | S25, S55, S97 |
| NOT-F-023 | Embeds | Live embeds (Google Drive, Figma, Loom, GitHub Gist, maps and any URL via `/embed`). | partial | URL line or raw `<iframe>`; live rendering is an app concern. | S18, S55 |
| NOT-F-024 | Bookmarks and link previews | Link card with title and thumbnail, or URL pasted as mention or live preview (GitHub, Jira, Slack, Zendesk). | partial | Plain link; preview metadata and live status fetched at render time. | S11, S18, S31, S55 |
| NOT-F-025 | Table of contents block | Auto-generated list of the page's headings (`/toc`). | partial | Generated at render; needs a placeholder token (no OFM core syntax). | S29, S55 |
| NOT-F-026 | Synced blocks | One block group shown and editable in many places; original is labelled; unsync breaks the link. | partial | OFM block embed `![[Page#^id]]` gives read-only transclusion; in-place editing of copies is not representable. | S45, S97 |
| NOT-F-027 | Buttons | Block or database property that runs actions: insert blocks, edit pages, send notifications or webhooks. | no | Actions need runtime; could store a definition in a fenced block. | S5, S15, S67 |
| NOT-F-028 | Interactive HTML block | HTML block rendered on the page (3.6, July 2026; details unverified). | partial | Raw HTML is valid Markdown; sandboxing is an app concern. | S91 |
| NOT-F-029 | Slash menu | `/` opens block insertion, actions (`/delete`, `/duplicate`) and colors (`/red`). | yes | UI only; inserts standard Markdown. | S29, S55 |
| NOT-F-030 | Markdown typing shortcuts | `**`, `*`, `` ` ``, `~`, `#`, `[]`, `---` convert as you type. | yes | UI only. | S29, S55 |
| NOT-F-031 | Block manipulation | `⋮⋮` handle to drag; Turn into via menu or `cmd/ctrl+option/shift+number`; select with `esc`, move with `cmd/ctrl+shift+arrows`, duplicate with `cmd/ctrl+D`. | yes | UI only. | S29, S53 |
| NOT-F-032 | Nested blocks | `tab` nests any block under another; indent persists for paragraphs too. | partial | Lists nest; an indented paragraph becomes a code block in CommonMark, so non-list nesting needs a convention. | S29 |
| NOT-F-033 | Date mentions and reminders | `@today`, `@tomorrow` or a date inline; optional reminder notification. | partial | ISO date text or `[[2026-10-16]]` daily-note link; reminder needs server state. | S10, S41 |
| NOT-F-034 | Presentation mode | Present any page fullscreen; dividers mark slides (March 2026, Plus and above). | yes | Dividers are `---`; Obsidian Slides uses the same convention. | S78 |

## Pages & hierarchy

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-035 | Nested pages | Any page can contain subpages; a page is both a document and a container. | partial | File plus same-name folder ("folder note") convention; not OFM core. | S35, S53 |
| NOT-F-036 | Sidebar, Favorites and Library | Sidebar sections for Favorites, Teamspaces, Shared, Private with drag to reorder and nest; full-page Library with the same tabs (Feb 2026). | partial | Folder tree yes; manual sort order and favorites need metadata (Obsidian keeps bookmarks in `.obsidian/bookmarks.json`). | S35, S76 |
| NOT-F-037 | Teamspaces and workspaces | Teamspaces with own members, default permissions and settings, inside one or more switchable workspaces. | partial | Workspace maps to a vault; teamspace to a top-level folder; membership and ACL live on the server. | S28 |
| NOT-F-038 | Duplicate and move pages | Duplicate a page or move it under another parent. | yes | File copy and move; links need rewriting on move. | S17 |
| NOT-F-039 | Trash | Deleted pages kept 30 days, then purged (owners can change on Enterprise). | partial | Obsidian `.trash` folder option; retention is app policy. | S17 |
| NOT-F-040 | Archive pages | Mark outdated pages archived; banner shows who and when; hidden from search, sidebar and views (March 2026). | partial | Frontmatter `archived: true` plus hide rules. | S3, S82 |
| NOT-F-041 | Version history | Snapshots every 10 minutes while editing; restore, name versions; retention 7, 30, 90 days or custom by plan; 3.8 adds highlighted edits and attribution. | partial | Content snapshots via git or server history; attribution is server metadata. | S17, S94 |
| NOT-F-042 | Wikis and verified pages | Wiki pages with owners; verification for a period or indefinitely, with expiry reminders. | partial | Frontmatter `owner`, `verified_until`; reminders need server. | S54 |
| NOT-F-043 | Breadcrumbs | Top-bar path with sibling pages on hover (April 2026), plus an inline breadcrumb block. | yes | Derived from folder path at render; no file syntax needed. | S55, S86 |

## Databases & views

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-044 | Databases (full page and inline) | Collection of pages that share typed properties; can sit inline on a page. | partial | Folder of notes with frontmatter properties plus a view file (Obsidian Bases `.base`). | S27, S95 |
| NOT-F-045 | Data sources | A database can hold several data sources, each with its own schema (API 2025-09-03). | partial | One folder or tag per source; multi-source container is a view concern. | S57 |
| NOT-F-046 | Basic property types | Text, Number (with formats), Select, Multi-select, Status, Date, Checkbox, URL, Email, Phone. | yes | YAML frontmatter scalars and lists (Obsidian Properties). Status maps to select with ordered groups. | S15, S99 |
| NOT-F-047 | Person and Files & media properties | Assign workspace members; attach files to a row. | partial | Person-note links or names; file lists as relative paths or `[[file]]`; account resolution needs server. | S15 |
| NOT-F-048 | Relation property | Link rows across databases, optionally two-way. | partial | Frontmatter list of `[[links]]`; two-way sync must be maintained by the app. | S15, S40 |
| NOT-F-049 | Formulas and rollups | Formula language over properties; rollups aggregate over related rows, with number formats since April 2026. | partial | Definitions in a view file (Bases supports formulas); values computed, not stored. | S22, S40, S87, S95 |
| NOT-F-050 | System properties | Created time, Created by, Last edited time, Last edited by, and auto-increment ID with optional prefix. | partial | Times from file metadata or frontmatter; "by" needs server attribution; IDs assigned by the app risk collision offline. | S15 |
| NOT-F-051 | Table view | Rows and property columns; freeze column, wrap, calculations. | partial | Rendered from frontmatter; view config in a view file. | S47, S51 |
| NOT-F-052 | Board view | Kanban grouped by a property (often Status). | partial | Group-by in view file; card order needs metadata. | S4, S51 |
| NOT-F-053 | Calendar view | Rows placed on a calendar by a Date property; weekends toggle. | partial | Date property in frontmatter; view config in file. | S6, S51 |
| NOT-F-054 | Timeline view | Gantt-style bars from start and end dates; dependencies. | partial | Date range in frontmatter. | S49, S51 |
| NOT-F-055 | List and gallery views | Minimal list of rows; cards with cover from content or a Files & media property. | partial | View config; cover from first image or property. | S23, S32, S51 |
| NOT-F-056 | Chart view and `/chart` | Bar, line and donut charts from database data; drill into underlying rows. | partial | Data is Markdown; chart definition needs a fenced config block. | S7, S64 |
| NOT-F-057 | Feed and map views | Rows as a scrolling feed with comments and reactions (July 2025); rows on a map from the Place property (Nov 2025). | partial | View config; Place as frontmatter coordinates or address; comments not in file. | S15, S20, S33, S71, S75 |
| NOT-F-058 | Dashboard view | Combine views, KPIs and charts in one view (March 2026, Business and Enterprise). | partial | Layout of embedded views in a page; KPIs computed. | S13, S80 |
| NOT-F-059 | Filters, sorts, groups | Property filters with nested AND/OR groups up to three levels; sorts; group and sub-group. | partial | Expressible in a view file (Bases filters); not in note bodies. | S51 |
| NOT-F-060 | Linked database views and tabs | Show an existing database with its own views on another page; view tabs styled per user (April 2026). | partial | Embed a view file (`![[tasks.base]]`). | S51, S84 |
| NOT-F-061 | Sub-items and dependencies | Parent and child rows, blocking relations; filter by sub-items (Nov 2025). | partial | `parent` and `blocked_by` link properties. | S48 |
| NOT-F-062 | Row page layouts and conditional coloring | Customize how a row page arranges properties; tabbed layout for several databases; color rows or cards by rules. | no | View and layout config, not row content. | S30, S68, S75 |
| NOT-F-063 | Forms | Form views writing responses into a database; conditional logic; respondents can see only their own submissions. | partial | Responses become rows (notes); form runtime is server. Forms cannot be exported. | S19, S21, S68 |
| NOT-F-064 | Database automations | Triggers on property changes or schedule; actions edit pages, notify, email, call webhooks. | no | Server runtime. | S14 |
| NOT-F-065 | Database row and column permissions | Row-level access (Sept 2025), "Can create pages" (March 2026), column permissions (Oct 2026). | no | Server ACL. | S43, S73, S94 |
| NOT-F-066 | Synced databases | Live tables from GitHub, Jira, Salesforce; rebuilt with health status in 3.8. | no | External sync service. | S46, S94 |

## Linking & navigation

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-067 | Page mentions and links | `@`, `[[` or `+` inserts an inline page link whose label follows renames. | yes | OFM `[[Page]]`; app must rewrite links on rename. | S10, S11, S98 |
| NOT-F-068 | Link to page block | Block-level link to another page (`/link`). | yes | A line containing `[[Page]]`. | S11 |
| NOT-F-069 | Backlinks | Pages that mention the current page, shown above the title. | yes | Derived from `[[links]]` index. | S11 |
| NOT-F-070 | Link to block | "Copy link to block" from the `⋮⋮` menu. | partial | OFM `[[Page#^blockid]]`; requires writing `^id` markers into the file. | S11, S98 |
| NOT-F-071 | People mentions | `@name` mentions people or groups and notifies them. | partial | Text or person-note link; notification needs server. | S10 |
| NOT-F-072 | Search and Quick Find | Workspace search with filters, keyword jumps to settings, `cmd/ctrl+P`. | yes | Full-text index over files. | S42, S65 |
| NOT-F-073 | Hover previews and floating TOC | Page preview on hover; floating heading outline on hover. | yes | Derived from files and headings. | S61 |

## Collaboration

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-074 | Real-time multiplayer editing | Several people edit the same page live. | partial | Content is Markdown; live merge needs a CRDT or OT layer on top. | S56 |
| NOT-F-075 | Comments, discussions and reactions | Threads on a page, text or block; resolve, filter by person or status; discussions panel and emoji reactions (Nov 2025). | no | Sidecar comment file with text anchors. | S10, S74 |
| NOT-F-076 | Suggested edits | Propose changes that owners accept or reject. | partial | CriticMarkup (`{++add++}`, `{--del--}`) in the file, or sidecar. | S44, S63 |
| NOT-F-077 | Share permissions, guests and links | Full access, Can edit, Can edit content, Can create, Can comment, Can view; subpages inherit; guests; "Anyone on the web with link" with expiry. | no | Server ACL and tokens. | S43 |
| NOT-F-078 | Notion Sites | Publish pages as a site with custom domain, SEO settings, theme. | partial | Static site generated from Markdown (Obsidian Publish model). | S39, S62 |
| NOT-F-079 | Inbox and notifications | Mentions, replies and edits in an inbox; mute replies; grouped notifications. | no | Server state. | S10, S74 |

## Templates

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-080 | Database templates | Named template pages with preset properties and content, chosen from the `New` dropdown. | yes | Template note with frontmatter (Obsidian Templates core plugin). | S16 |
| NOT-F-081 | Repeating templates | Create a template copy daily, weekly, monthly or yearly at a set time. | partial | Template is Markdown; schedule needs server. | S16 |
| NOT-F-082 | Template gallery and one-click setups | 20k+ public templates, paid Marketplace, pre-built task tracker, meeting notes and brainstorm setups (Feb 2025). | partial | Templates are folders of Markdown and view files; marketplace out of scope. | S63, S65, S67 |

## Import/export

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-083 | Markdown and text import | `.md`, `.txt`; zip a folder to keep its structure; nonstandard extensions may not import cleanly. | yes | Native format for Quire. | S26 |
| NOT-F-084 | CSV import | New database or merge into existing; choose property type per column; adds rows only. | partial | Rows to notes with frontmatter; relations need mapping. | S26, S71 |
| NOT-F-085 | Document and app importers | Word, HTML, PDF, Google Docs, Confluence, Evernote, Trello, Asana, Monday, Quip, Dropbox Paper, WorkFlowy. | partial | Convert to Markdown; app-specific structures are lossy. | S26 |
| NOT-F-086 | Markdown & CSV export | Pages to Markdown, databases to CSV plus a Markdown file per row; callouts as HTML. | partial | See data-model.md for losses. | S19 |
| NOT-F-087 | HTML and PDF export | HTML can include comments; PDF with subpages on Business and Enterprise. | partial | Derived render outputs, not storage. | S19 |
| NOT-F-088 | Workspace export | Whole workspace as HTML or Markdown and CSV, delivered by email link valid 7 days; processing up to 30 hours. | yes | A Markdown vault is already its own export. | S19 |
| NOT-F-089 | Web Clipper | Save web pages to a page or database from browser or mobile share sheet. | yes | Clip to Markdown note with source URL in frontmatter. | S52 |

## Offline & sync

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-090 | Offline pages | View, edit and create pages without a connection on desktop and mobile apps; not in web browsers (Aug 2025, all plans). | yes | Local Markdown files are offline by default. | S24, S50, S72 |
| NOT-F-091 | Selective and automatic downloads | Per-page "Available offline" toggle per device (subpages not included); Recents and Favorites auto-downloaded on Plus and above; managed in Settings > Offline. | partial | Selective sync list is app metadata. | S50, S72 |
| NOT-F-092 | Offline databases | Downloads the first 50 rows of the first view; more rows downloaded individually. | yes | Rows are files, so all rows sync. | S50, S56 |
| NOT-F-093 | Offline conflict handling | Text edits merged automatically via CRDT; non-text edits (for example same select property) keep only one change. | partial | Text merge on Markdown is feasible; frontmatter fields resolve per key. | S24, S50, S56 |
| NOT-F-094 | Online-only blocks | Embeds, AI blocks, forms and buttons unavailable offline and greyed out in the slash menu; no sharing changes offline. | yes | UI behaviour. | S50 |

## Mobile

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-095 | iOS and Android apps | Read, edit and comment, offline pages; no multi-block select, import, security or billing on mobile. | yes | Same Markdown files. | S37, S50 |
| NOT-F-096 | Mobile editing toolbar and layout | Toolbar above the keyboard (block type, formatting, indent, color, undo); no hover states; columns stack on phones. | yes | UI only. | S9, S37, S55 |
| NOT-F-097 | Share sheet capture | Share URLs, photos and files into a page or database from iOS and Android. | yes | New note or attachment. | S52 |
| NOT-F-098 | Widgets and shortcuts | Home-screen widget (now Notion AI widget); iOS Shortcuts to create page, search, add text, open doc. | yes | UI only. | S37, S66 |

## Integrations/API

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-099 | Public REST API | Pages, blocks, databases, data sources, comments, users; OAuth connections. | partial | A file and frontmatter API maps most of it; block IDs need markers. | S1, S57, S60 |
| NOT-F-100 | Markdown Content API | Read, create and update pages as Markdown; "Notion-flavored Markdown" v2 uses XML-like tags for toggles, callouts, columns, mentions. | partial | Shows the gap: Notion needs non-CommonMark tags for its own blocks. | S58, S59, S81 |
| NOT-F-101 | Webhooks | Real-time notifications on content and schema changes (March 2025). | yes | File-change events. | S57, S68 |
| NOT-F-102 | Notion MCP | MCP server letting AI tools read, create and update Notion content (Aug 2025). | yes | MCP over Markdown files is straightforward. | S38, S72 |
| NOT-F-103 | Developer platform | Workers runtime, CLI, Agent SDK, database sync from any API (May 2026). | no | Out of scope runtime. | S89 |
| NOT-F-104 | Notion Calendar and Mail | Date databases shown and edited in Notion Calendar with two-way sync; separate Notion Mail client. | partial | Dates in frontmatter allow ICS export; Mail is a separate product. | S69, S72, S75 |

## AI

| ID | Feature | Description | MD? | Mapping note | Src |
| --- | --- | --- | --- | --- | --- |
| NOT-F-105 | Notion Agent | Chat agent that edits pages and databases, with memory, plan mode and suggested edits for approval. | partial | Output is Markdown; agent runtime is a service. | S36, S88, S92 |
| NOT-F-106 | Custom Agents | Agents on triggers or schedules with credits, admin controls and audit logs (Feb 2026). | no | Server runtime and billing. | S77 |
| NOT-F-107 | AI Meeting Notes | Block that records, transcribes and summarizes meetings. | partial | Summary and transcript as Markdown; recording is a service. | S2, S70 |
| NOT-F-108 | AI Autofill and AI-built databases | AI fills property values; build a database from a prompt. | partial | Values land in frontmatter. | S67, S85 |
| NOT-F-109 | Enterprise Search and AI connectors | Search across Notion and Slack, Google Drive, Jira, GitHub and more. | no | External index. | S70 |
| NOT-F-110 | AI image generation and skills | Generate images, charts and diagrams on the page (March 2026); reusable AI skills stored as pages, run with `/` (Sept 2026). | partial | Images become file embeds; skills are Markdown pages. | S79, S93 |

## Sources

Notion Help Center:

- S1 https://www.notion.com/help/add-and-manage-connections-with-the-api
- S2 https://www.notion.com/help/ai-meeting-notes
- S3 https://www.notion.com/help/archive-pages
- S4 https://www.notion.com/help/boards
- S5 https://www.notion.com/help/buttons
- S6 https://www.notion.com/help/calendars
- S7 https://www.notion.com/help/charts
- S8 https://www.notion.com/help/code-blocks
- S9 https://www.notion.com/help/columns-headings-and-dividers
- S10 https://www.notion.com/help/comments-mentions-and-reminders
- S11 https://www.notion.com/help/create-links-and-backlinks
- S12 https://www.notion.com/help/customize-and-style-your-content
- S13 https://www.notion.com/help/dashboards
- S14 https://www.notion.com/help/database-automations
- S15 https://www.notion.com/help/database-properties
- S16 https://www.notion.com/help/database-templates
- S17 https://www.notion.com/help/duplicate-delete-and-restore-content
- S18 https://www.notion.com/help/embed-and-connect-other-apps
- S19 https://www.notion.com/help/export-your-content
- S20 https://www.notion.com/help/feeds
- S21 https://www.notion.com/help/forms
- S22 https://www.notion.com/help/formulas
- S23 https://www.notion.com/help/galleries
- S24 https://www.notion.com/help/guides/working-offline-in-notion-everything-you-need-to-know
- S25 https://www.notion.com/help/images-files-and-media
- S26 https://www.notion.com/help/import-data-into-notion
- S27 https://www.notion.com/help/intro-to-databases
- S28 https://www.notion.com/help/intro-to-teamspaces
- S29 https://www.notion.com/help/keyboard-shortcuts
- S30 https://www.notion.com/help/layouts
- S31 https://www.notion.com/help/link-previews
- S32 https://www.notion.com/help/lists
- S33 https://www.notion.com/help/maps
- S34 https://www.notion.com/help/math-equations
- S35 https://www.notion.com/help/navigate-with-the-sidebar
- S36 https://www.notion.com/help/notion-ai-faqs
- S37 https://www.notion.com/help/notion-for-mobile
- S38 https://www.notion.com/help/notion-mcp
- S39 https://www.notion.com/help/public-pages-and-web-publishing
- S40 https://www.notion.com/help/relations-and-rollups
- S41 https://www.notion.com/help/reminders
- S42 https://www.notion.com/help/search
- S43 https://www.notion.com/help/sharing-and-permissions
- S44 https://www.notion.com/help/suggested-edits
- S45 https://www.notion.com/help/synced-blocks
- S46 https://www.notion.com/help/synced-databases
- S47 https://www.notion.com/help/tables
- S48 https://www.notion.com/help/tasks-and-dependencies
- S49 https://www.notion.com/help/timelines
- S50 https://www.notion.com/help/use-pages-offline
- S51 https://www.notion.com/help/views-filters-and-sorts
- S52 https://www.notion.com/help/web-clipper
- S53 https://www.notion.com/help/what-is-a-block
- S54 https://www.notion.com/help/wikis-and-verified-pages
- S55 https://www.notion.com/help/writing-and-editing-basics

Notion engineering blog:

- S56 https://www.notion.com/blog/how-we-made-notion-available-offline

Notion developer docs:

- S57 https://developers.notion.com/docs/upgrade-guide-2025-09-03
- S58 https://developers.notion.com/guides/data-apis/notion-flavored-markdown
- S59 https://developers.notion.com/guides/data-apis/working-with-markdown-content
- S60 https://developers.notion.com/reference/block

Notion release notes (notion.com/releases):

- S61 https://www.notion.com/releases/2024-06-11 (2.40: floating table of contents, hover previews)
- S62 https://www.notion.com/releases/2024-06-25 (2.42: Notion Sites)
- S63 https://www.notion.com/releases/2024-07-29 (2.43: suggested edits, template gallery)
- S64 https://www.notion.com/releases/2024-08-13 (2.44: charts)
- S65 https://www.notion.com/releases/2024-10-24 (2.46: forms, layouts, custom emoji, Cmd+P, Marketplace)
- S66 https://www.notion.com/releases/2024-12-05 (2.47: iOS Shortcuts, button and automation webhooks)
- S67 https://www.notion.com/releases/2025-02-18 (2.48: one-click setups, AI-built databases, buttons insert blocks)
- S68 https://www.notion.com/releases/2025-03-26 (2.49: verification, webhooks, conditional forms, tabbed layout)
- S69 https://www.notion.com/releases/2025-04-15 (2.50: Notion Mail)
- S70 https://www.notion.com/releases/2025-05-13 (2.51: AI Meeting Notes, Enterprise Search, connectors)
- S71 https://www.notion.com/releases/2025-07-10 (2.52: database redesign, feed view, CSV import)
- S72 https://www.notion.com/releases/2025-08-19 (2.53: offline mode, Notion MCP, Calendar tasks, Mail on iOS)
- S73 https://www.notion.com/releases/2025-09-18 (3.0: Agents, database row permissions)
- S74 https://www.notion.com/releases/2025-11-14 (page discussions, grouped inbox)
- S75 https://www.notion.com/releases/2025-11-17 (3.1: map view, Place property, conditional coloring, Calendar two-way sync)
- S76 https://www.notion.com/releases/2026-02-18 (Library)
- S77 https://www.notion.com/releases/2026-02-24 (3.3: Custom Agents)
- S78 https://www.notion.com/releases/2026-03-02 (present any page)
- S79 https://www.notion.com/releases/2026-03-09 (AI image generation)
- S80 https://www.notion.com/releases/2026-03-10 (dashboard views)
- S81 https://www.notion.com/releases/2026-03-26 (3.4 part 1: H4, tabs block, dashboards, Markdown Content API)
- S82 https://www.notion.com/releases/2026-03-27 (archive pages)
- S83 https://www.notion.com/releases/2026-03-30 (tabs block)
- S84 https://www.notion.com/releases/2026-04-10 (customizable database tabs)
- S85 https://www.notion.com/releases/2026-04-14 (3.4 part 2: AI Autofill, Can create pages permission)
- S86 https://www.notion.com/releases/2026-04-24 (breadcrumb sibling pages)
- S87 https://www.notion.com/releases/2026-04-27 (rollup number formats)
- S88 https://www.notion.com/releases/2026-05-07 (Plan Mode)
- S89 https://www.notion.com/releases/2026-05-13 (3.5: developer platform)
- S90 https://www.notion.com/releases/2026-05-26 (merge cells in simple tables)
- S91 https://www.notion.com/releases/2026-07-01 (3.6: HTML blocks)
- S92 https://www.notion.com/releases/2026-08-28 (agent suggested edits)
- S93 https://www.notion.com/releases/2026-09-15 (3.7: skills)
- S94 https://www.notion.com/releases/2026-10-13 (3.8: version history, column permissions, rebuilt synced databases)

Obsidian help (mapping targets for the MD? column):

- S95 https://help.obsidian.md/bases
- S96 https://help.obsidian.md/callouts
- S97 https://help.obsidian.md/embeds
- S98 https://help.obsidian.md/links
- S99 https://help.obsidian.md/properties
