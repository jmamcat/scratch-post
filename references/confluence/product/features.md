# Confluence (Cloud): feature inventory

Scope: Confluence Cloud as documented on support.atlassian.com and atlassian.com, checked 2026-10-16.
Data Center behaviour is out of scope unless noted. Items not confirmed against an official page are marked "(unverified)".

Column "MD?" answers: can the feature's content be stored in a plain Markdown file (Obsidian defaults: CommonMark + GFM tables and tasks, YAML frontmatter, `[[wikilinks]]`, `![[embeds]]`, callouts, `#tags`) without a sidecar database?

- **yes**: maps cleanly to Markdown or to a plain file/folder.
- **partial**: maps with loss, needs a convention, an HTML fallback, or a sidecar file.
- **no**: server state or a proprietary format; not stored in the Markdown body.

## Editor & macros

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-001 | Cloud editor | Block-based rich-text editor; the only editor since the legacy editor was retired in April 2026. Native format is ADF JSON. | partial | Quire stores Markdown and renders a WYSIWYG view over it; ADF-only node types need conventions below. |
| CNF-F-002 | Markdown autoformat | Typing `**b**`, `*i*`, `~~s~~`, `` `c` ``, `#` to `######`, `*`, `1.`, `>`, ` ``` `, `---`, `[t](url)` converts to rich text; `[]` makes an action item, `<>` a decision. | yes | Same syntax is the storage format; `<>` decision has no Markdown equivalent (see decision row). |
| CNF-F-003 | Slash insert menu and + button | `/` anywhere, or the + on block hover, searches and inserts any element or macro. | yes | UI only; inserts Markdown syntax. |
| CNF-F-004 | Block menu "Change format" | Transform a selected block (for example into a layout or panel) from a per-block menu. | yes | UI only; rewrites the Markdown block. |
| CNF-F-005 | Keyboard shortcut sheet | Ctrl+/ or Cmd+/ opens the shortcut list (General, Formatting, Markdown). | yes | UI only. |
| CNF-F-006 | Headings H1 to H6 | Six heading levels; feed the Table of Contents macro. | yes | `#` to `######`. |
| CNF-F-007 | Text marks | Bold, italic, strikethrough, inline code, underline, subscript/superscript, text color, highlight. | partial | First four native; underline `<u>`, sub/sup `<sub>`/`<sup>`, Obsidian highlight `==x==`; text color needs `<span style>` (lossy). |
| CNF-F-008 | Lists | Bulleted, numbered, nested lists. | yes | CommonMark lists. |
| CNF-F-009 | Action items | Checklist items, assignable with @mention, optional due date that turns red when overdue; appear in the assignee's task list. | partial | `- [ ]` / `- [x]`; assignee and date as inline `@user` and `📅 YYYY-MM-DD` (Obsidian Tasks convention). Cross-page task list needs an index. |
| CNF-F-010 | Decision | Grey panel with green icon marking a decision; `/decision` or `<>`. | partial | Custom callout `> [!decision]`. |
| CNF-F-011 | Code snippet | Fenced code with language selection, auto-detect for 12 languages, line numbers toggle, wrap toggle, auto-format for JS/JSON/SQL. | yes | Fenced block with info string; line numbers and wrap are view settings, not content. |
| CNF-F-012 | Tables | Header row/column, numbered rows, merged cells, column widths, sort (unverified for sort in current editor), block content in cells. | partial | GFM pipe tables for simple cases; merged cells, widths and multi-paragraph cells need HTML `<table>`. |
| CNF-F-013 | Panels | Five presets (info, note, error, success, warning) each with emoji and background; 20 custom background colors; emoji add/remove. | partial | Presets map to Obsidian callouts `> [!info]`, `> [!note]`, `> [!error]`, `> [!success]`, `> [!warning]`. Custom colors and emoji lost or need a callout metadata convention. |
| CNF-F-014 | Expand | Collapsible section with title; nested expand supported in ADF (`nestedExpand`). | yes | `<details><summary>Title</summary>` or foldable callout `> [!note]- Title`. |
| CNF-F-015 | Quote | Blockquote with left rule. | yes | `>`. |
| CNF-F-016 | Divider | Horizontal rule. | yes | `---`. |
| CNF-F-017 | Status lozenge | Inline colored label; space admins manage the content-status set separately (see Spaces). | partial | No standard; options: inline `#status/done` tag, or `<span class="status" data-color="green">DONE</span>`. |
| CNF-F-018 | Date element | Inline date node; `//` opens a picker; default display `Mon DD, YYYY`. | partial | ISO `2026-10-16` text; rendering as a chip is a view concern. |
| CNF-F-019 | Mention | `@name` inserts a user reference and notifies the user. | partial | `@handle` text or `[[people/handle]]` link; notifications are server behaviour. |
| CNF-F-020 | Emoji | Standard plus site-wide custom emoji. | partial | Unicode emoji yes; custom emoji as `:shortcode:` needs a registry. |
| CNF-F-021 | Layouts | Multi-column sections (two columns by default, more options). | no | No Markdown columns; HTML `<div>` grid is fragile. Candidate to reject. |
| CNF-F-022 | Images and media | Single image/video with size, alignment, caption; inline media; media groups. | partial | `![alt](path)` or `![[img.png\|300]]` for width; alignment and caption need a convention. |
| CNF-F-023 | File previews | Embedded PDF and file previews on the page. | partial | Obsidian `![[file.pdf]]`. |
| CNF-F-024 | Links and anchors | Links to pages, headings, URLs; Anchor macro marks a jump target. | yes | `[[Page#Heading]]`, `[text](url)`; anchor maps to heading link or `^block-id`. |
| CNF-F-025 | Smart Links | Pasted URLs unfurl; display as URL, inline, card or embed; default per domain. | partial | Store the URL; display mode needs a convention (for example a title attribute or `![](url)` for embed). Unfurl is render-time. |
| CNF-F-026 | Table of Contents macro | Lists selected heading levels of the current page; Table of Content Zone limits the section. | partial | Generate at render time from headings; needs a placeholder such as a ` ```toc ` block (no standard). |
| CNF-F-027 | Children display and content tree macros | Render a live list or tree of child content from a root item. | partial | Render-time folder listing; placeholder block. |
| CNF-F-028 | Excerpt and Insert excerpt | Mark a section for reuse and display it on other pages. Atlassian now points users to synced blocks. | partial | Obsidian embed `![[Page#Section]]`. |
| CNF-F-029 | Synced blocks | Source block edited in one place, shown view-only on other pages, live docs and Jira work items; destination inherits source permissions; unsync makes a local copy. | partial | `![[Page#^block-id]]` transclusion; permission inheritance is server-side. |
| CNF-F-030 | Include page | Embed another page's full content. | yes | `![[Page]]`. |
| CNF-F-031 | Filter by label / Content by label | Lists content matching labels with CQL-backed filters (label, title, type, creator, space, child pages). | partial | Query code block over the tag index; not portable to other Markdown tools. |
| CNF-F-032 | Page properties and properties report | Key/value table on a page, aggregated into a report table across pages. | partial | YAML frontmatter plus a query block. |
| CNF-F-033 | Task report macro | Aggregates action items across pages by assignee, space, label, status. | partial | Query over `- [ ]` items in the vault. |
| CNF-F-034 | Reporting and info macros | Change-history, contributors, user list, spaces list, blog posts, live search, page index, labels list, gallery, attachments. | partial | Render-time widgets; most need server data. Keep only a handful. |
| CNF-F-035 | Jira macros | Jira issues list, Jira chart, roadmap embeds. | no | External integration; store as a link. |
| CNF-F-036 | Chart macro | Chart rendered from a table. | partial | Code block (for example a chart spec over a table); no standard. |
| CNF-F-037 | Diagrams (Marketplace) | draw.io and Gliffy diagrams via apps; draw.io is fully supported on mobile. | partial | Mermaid code block, or attached `.drawio`/`.svg` file embedded with `![[...]]`. |
| CNF-F-038 | iFrame and Widget connector | Embed external pages and widgets. | partial | Raw `<iframe>` HTML, sanitized at render. |
| CNF-F-039 | Page title emoji, header image, page width | Emoji shown in title and tree; cover image; fixed or full width (width option unverified in this check). | partial | Frontmatter keys such as `icon`, `cover`, `width`. |
| CNF-F-040 | Legacy editor and Legacy Content Macro | Legacy editor retired in phases (Jan 21, Feb 18, Apr 1 2026); unconvertible content wrapped in a view-only Legacy Content Macro. | no | Historical; relevant only to import. |

## Spaces & page tree

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-041 | Spaces | Top-level container with key, name, sidebar, overview page, settings, permissions. | partial | Top-level folder plus a space config file; permissions do not live in Markdown. |
| CNF-F-042 | Personal spaces | One space per user; default target when the user lacks edit rights elsewhere. | yes | Folder per user. |
| CNF-F-043 | Space overview | Customizable home page of a space. | yes | `index.md` or `README.md` in the space folder. |
| CNF-F-044 | Content tree sidebar | Hierarchical tree of pages, live docs, folders, whiteboards, databases, Smart Links; hover + to create a child. | partial | Folder hierarchy; manual sibling order needs frontmatter `order` or a per-folder order file. |
| CNF-F-045 | Pages as parents | Any page can have child pages and still hold content. | partial | Folder-note convention: `Parent.md` beside `Parent/`. |
| CNF-F-046 | Folders | Passive tree nodes with no content; created only from the content tree; deleting a folder moves its children up a level; enabled per space. | yes | Plain directory. |
| CNF-F-047 | Smart Links in the content tree | A URL stored as a tree item. | partial | Small note with `url:` frontmatter. |
| CNF-F-048 | Blog posts | Date-stamped posts per space, separate from the tree. | partial | `blog/YYYY-MM-DD-slug.md` with frontmatter. |
| CNF-F-049 | Move and copy | Move or copy pages with their children within or across spaces. | yes | File move with link rewriting. |
| CNF-F-050 | Archive | Archived items leave the tree, appear under Archived in the sidebar, keep working links with an "Archived" lozenge; bulk archive on Premium/Enterprise. | partial | `_archive/` folder or `archived: true` frontmatter. |
| CNF-F-051 | Trash, restore, purge | Deleted content goes to space trash; restore or purge permanently. | partial | `.trash/` folder (Obsidian default). |
| CNF-F-052 | Content status | Space-defined statuses on content; filterable in content manager; usable by automation. | yes | Frontmatter `status:`. |
| CNF-F-053 | Content manager | Bulk view, filter, archive, change status of a space's content (Premium/Enterprise). | yes | UI over files and frontmatter. |
| CNF-F-054 | Company Hub | Site-wide landing page with sections. | partial | A designated home note; section element has no Markdown form. |
| CNF-F-055 | Starred and recent | Per-user starred items and recently visited list. | no | Per-user server or client state. |

## Versions & history

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-056 | Version per publish | Each publish or update creates a numbered version. | partial | Snapshot or commit per save; version metadata in a sidecar or VCS. |
| CNF-F-057 | Version history list | Opened from the page menu; lists versions with author, date and version comment. | partial | Rendered from VCS log or sidecar. |
| CNF-F-058 | Version comment | Optional message at publish time; recorded in history; sent to watchers when "notify" is chosen. | yes | Commit message. |
| CNF-F-059 | Compare selected versions | Tick checkboxes for two versions, then "Compare selected versions"; differences shown, large unchanged sections collapsed. Color coding of added and removed text (green insert, red delete) is documented for older versions (unverified for current Cloud). | yes | Text diff of two Markdown revisions, shown rendered and as source. |
| CNF-F-060 | Restore this version | Restoring copies the old version as the newest version; later versions are kept. | yes | Write old content as a new revision. |
| CNF-F-061 | Delete a version | Permanent, bypasses trash, remaining versions renumbered. | partial | History rewrite; candidate to reject. |
| CNF-F-062 | Drafts | New pages and blog posts autosave as private drafts until published; "Close draft" leaves the editor. | partial | Draft file outside the shared tree, or `draft: true` frontmatter. |
| CNF-F-063 | Unpublished changes | Edits to a published page autosave, are visible to other editors, badge marks the page, "View changes" shows the diff, "Revert to previous version" discards them (unrecoverable). | partial | Working copy versus last published revision. |
| CNF-F-064 | Schedule publish | Pick a date and time in the publish modal; latest edits at that time are published; no notifications until then. | partial | Frontmatter `publish_at` plus a server job. |
| CNF-F-065 | Live doc version grouping | Live docs autosave; a version starts when editing begins and is finalised about 10 to 15 minutes after the last edit; compare and revert from More actions. | yes | Time-coalesced snapshots of the file. |
| CNF-F-066 | Attachment versions | Uploading a same-name file creates a new version; versions listed in the Attachments panel; download or share old versions; no revert. | partial | Binary versions in VCS or a content-addressed store. |
| CNF-F-067 | Whiteboard and database history | Last 30 days kept; restore creates a new whiteboard or database rather than overwriting. | no | Not Markdown content. |

## Comments & collaboration

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-068 | Real-time co-editing | Up to 30 people edit a page together (up to 40 on a live doc, 100 viewers); changes sync automatically. | partial | Needs a sync layer (CRDT or OT) over Markdown text; storage stays Markdown. |
| CNF-F-069 | Presence avatars | Active editors shown in color, departed editors in greyscale. | no | Ephemeral session state. |
| CNF-F-070 | Live docs | Autosaved, no drafts, no publish; visible to all with access immediately; convertible to and from pages (footer comments do not carry into the live doc). | yes | Obsidian's default autosave model; a `mode:` frontmatter key if both modes exist. |
| CNF-F-071 | Inline comments | Anchored to highlighted text (yellow), images and videos; images in comments need edit access. | partial | Sidecar file with text-quote anchors; HTML comment markers in the body pollute the file. |
| CNF-F-072 | General (footer) comments | Page-level comments below content or in the comments panel. | partial | Sidecar file per page. |
| CNF-F-073 | Replies, resolve, reopen | Threaded replies; only the root inline comment can be resolved; filter Resolved, then green Reopen. | partial | Sidecar state. |
| CNF-F-074 | Comments panel | Filter unread, resolved, open; sort; hide inline comments. | yes | UI over sidecar. |
| CNF-F-075 | Comments during editing | Comments added while editing are visible only to editors and send no notifications until publish. | partial | Sidecar flag tied to draft state. |
| CNF-F-076 | Comment edit and delete rules | Edit own comments; space admins edit any; delete own only when no replies; deleted comments unrecoverable. | no | Server permission logic. |
| CNF-F-077 | Reactions and likes | Reactions on pages and general comments; likes on inline comments; admin can disable site-wide. | no | Server metadata. |
| CNF-F-078 | Watch and notifications | Watch pages, live docs, spaces, whiteboards, blogs, slides; email and in-app notifications. | no | Server metadata. |
| CNF-F-079 | Share and copy link | Share content with people or teams; copy link. | no | Server feature. |
| CNF-F-080 | Page analytics | View counts and viewers per page and space (plan-dependent, unverified detail). | no | Server metadata. |

## Templates & blueprints

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-081 | Space templates | Space admins create templates under Space settings, Look and feel, Templates. | yes | `templates/` folder (Obsidian core Templates plugin). |
| CNF-F-082 | Global templates | Site admins create templates for all spaces. | yes | Shared templates folder. |
| CNF-F-083 | Blueprints | Built-in templates with formatting, macros and sample content; customizable per space. | partial | Template Markdown files; any creation wizard is UI. |
| CNF-F-084 | Template variables | Variables prompted at creation (cloud editor templates only). | partial | `{{title}}`, `{{date}}` placeholders; custom prompted variables need a convention. |
| CNF-F-085 | Template gallery | Browse and preview templates when creating content; also hosts the Google Docs import tab. | yes | UI over the templates folder. |
| CNF-F-086 | Create from template macro | Button on a page that opens the editor with a chosen template. | partial | Link with an app action URI. |
| CNF-F-087 | Space from template | Create a new space pre-populated from a space template. | partial | Copy a folder skeleton. |

## Search & labels

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-088 | Labels | Lowercase labels (spaces become hyphens) on pages, live docs, blog posts and attachments, added from the Details panel. | yes | Frontmatter `tags:` or inline `#tag`; attachment labels need a sidecar (partial). |
| CNF-F-089 | Label browse URL | `/wiki/label/a+b` lists content carrying all given labels. | yes | Tag view with AND filter. |
| CNF-F-090 | Search with filters | Quick search plus advanced filters (space, contributor, type, label, date); multiple labels combine with OR only. | yes | Full-text index over files and frontmatter. |
| CNF-F-091 | CQL | Confluence Query Language used by macros, REST search and automation. | partial | A small query syntax over frontmatter; no portable Markdown standard. |

## Databases, whiteboards, live docs, slides

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-092 | Databases | Structured tables with typed fields; created from Create, the tree, or `/database` in the editor; start blank, from template, from CSV, or connected to Jira. | partial | CSV file, or a folder of notes with frontmatter plus a view definition. |
| CNF-F-093 | Database views | Multiple views (table, board and others; exact set unverified) over one database. | partial | View definition file. |
| CNF-F-094 | Whiteboards | Infinite canvas with stickies, shapes, connectors, comments on canvas, voting (Nov 2024), Smart create. | partial | JSON Canvas `.canvas` (open format used by Obsidian) for basic boards. |
| CNF-F-095 | Slides | Slide decks as content items; Rovo generates slides from pages and other content. | no | Proprietary; a Markdown slide format (for example Marp) would be a separate choice (unverified that Confluence slides map). |

## Permissions

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-096 | Space roles | Preset roles Admin, Manager, Collaborator, Viewer, plus custom roles; replaced the older per-permission grid. | no | Server ACL config; never in the file. |
| CNF-F-097 | Granular space permissions | Add pages, attachments, comments, restrict, delete, manage guests, public links, export. | no | Server ACL. |
| CNF-F-098 | Page restrictions | Limit view or edit of a content item to users or groups; requires edit plus Restrict or Admin space permission. | no | Server ACL. |
| CNF-F-099 | Additive access | Access from groups and individuals stacks; a lower individual role cannot reduce group access. | no | Server ACL semantics. |
| CNF-F-100 | Guests and public links | Guest users and public share links, controlled per space. | no | Server feature. |
| CNF-F-101 | Access requests | Users request space access; admins approve. | no | Server workflow. |
| CNF-F-102 | Export blocking | Org policy can block PDF/Word page export and CSV/XML/PDF space export. | no | Server policy. |

## Import/export

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-103 | Page export to PDF and Word | From More actions; only the published version exports; Word output opens only in Microsoft Word. | partial | Markdown to PDF/DOCX through a converter; fidelity depends on extensions used. |
| CNF-F-104 | Space export | PDF (single file) or CSV, HTML, XML (zipped); page subset selectable; only visible content unless a site admin exports CSV/XML; PDF excludes blog posts and comments. | partial | Quire's native export is the folder of `.md` files itself. |
| CNF-F-105 | XML export end of life | XML site and space export reach end of life on December 1, 2026; CSV is the supported alternative. | no | Informational. |
| CNF-F-106 | PDF export layout | Customize headers, footers, title page and CSS for PDF exports. | partial | Converter template. |
| CNF-F-107 | No native Markdown export | Markdown export exists only through Marketplace apps, browser extensions and REST-based CLIs. | no | Gap Quire fills by design. |
| CNF-F-108 | Word import | `.docx` only; shapes become placeholders. | partial | DOCX to Markdown converter. |
| CNF-F-109 | Google Docs import | From the template browser Import tab; 5 MB per doc, up to 30 files and 50 MB in bulk. | partial | Converter. |
| CNF-F-110 | Notion import | Upload a Notion zip; OAuth token maps users, mentions and comments. | partial | Notion Markdown export is close to Quire's format. |
| CNF-F-111 | Markdown insert | Legacy-editor Insert, Markup, Markdown converted pasted Markdown one-way to rich text; not available in the cloud editor per the same doc. | partial | One-way; illustrates that Markdown is not a first-class format in Confluence. |
| CNF-F-112 | Site backup and space import | Admin backup file of the instance; import a Cloud space. | partial | Folder copy for Quire. |

## Offline & mobile

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-113 | Offline editing | Keep editing pages, live docs, blog posts and slides that were opened while online; changes saved locally in browser or app and synced on reconnect. | yes | Quire's native model: local Markdown files. |
| CNF-F-114 | Offline merge and conflict review | On reconnect Confluence merges as much as possible, highlights conflicts in the same part of the page, and lets the user keep offline edits, keep the online version, or combine manually. | yes | Three-way merge of Markdown text with a per-hunk review UI. |
| CNF-F-115 | Offline limits | No new content offline; no Rovo, some macros, integrations or external media; local data cleared after 7 days on Safari, 30 days by Atlassian. | no | Server-side limits; Quire should not copy: local files are permanent and creation works offline. |
| CNF-F-116 | Mobile apps | iOS and Android apps for viewing, editing and commenting (feature parity details unverified). | partial | Same Markdown files on Android. |
| CNF-F-117 | Mobile macro support | Full support only for Anchor, Blog Posts, Profile Picture, Table of Contents, User Profile, draw.io; others shown as placeholders that open a separate screen; macros cannot be added or edited on mobile. | partial | Argues for a small widget set that renders everywhere. |

## Integrations/API

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-118 | REST API v1 and v2 | v2 under `/wiki/api/v2/` covers pages, spaces, comments, versions, labels; CQL search remains on v1 (third-party source; unverified against official reference). | partial | Quire API can serve raw Markdown. |
| CNF-F-119 | Body representations | `storage` (XHTML with `ac:`/`ri:` namespaces) and `atlas_doc_format` (ADF JSON, returned as a JSON string) via `body-format`. | no | Proprietary; see data-model.md. |
| CNF-F-120 | Forge and Connect apps | Marketplace apps add macros, panels, content actions; limited support on live docs. | no | Extension model out of scope. |
| CNF-F-121 | Jira integration | Smart Links, Jira issue macros, synced blocks in work items, database connection to Jira. | partial | Links only. |
| CNF-F-122 | Automation | Rule-based automation on Confluence events (status, labels, publish); Rovo actions available. | no | Server feature. |
| CNF-F-123 | Chat apps | Rovo apps for Slack and Microsoft Teams (Confluence-specific notifications unverified). | no | Server integration. |

## AI/Rovo

| ID | Feature | Description | MD? | Mapping note |
| --- | --- | --- | --- | --- |
| CNF-F-124 | Summarize | Summarize a page, live doc, blog or whiteboard from the bottom-right action; needs enough content. | no | Ephemeral output; can be saved as a note. |
| CNF-F-125 | Writing help | Highlight text and Ask Rovo, or `/rovo` / `/ai` in the editor, to draft or edit. | yes | Output is Markdown text inserted into the file. |
| CNF-F-126 | Create with Rovo | Describe content, refine a preview, then add it as a live doc, draft page, whiteboard or database; consumes Rovo credits. | yes | Output is a new Markdown file (for documents). |
| CNF-F-127 | Comment summary | Summary of unresolved general and inline comments in the comments panel. | no | Ephemeral. |
| CNF-F-128 | Ask Rovo and Rovo chat | Q&A from search with sources; chat from header, action bar, or pressing space on a page. | no | Server feature over the index. |
| CNF-F-129 | Whiteboard AI | Generate ideas, group by theme, summarize to a page (Jan 2025). | no | Canvas feature. |

## Sources

- https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/
- https://support.atlassian.com/confluence-cloud/docs/create-and-collaborate-in-real-time-with-live-docs/
- https://support.atlassian.com/confluence-cloud/docs/configure-live-docs-in-confluence/
- https://support.atlassian.com/confluence-cloud/docs/edit-content-offline/
- https://support.atlassian.com/confluence-cloud/docs/available-markdown-commands/
- https://support.atlassian.com/confluence-cloud/docs/keyboard-shortcuts-markdown-and-autocomplete/
- https://support.atlassian.com/confluence-cloud/docs/insert-elements-into-a-page/
- https://support.atlassian.com/confluence-cloud/docs/transform-content-with-the-block-menu/
- https://support.atlassian.com/confluence-cloud/docs/what-are-macros/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-expand-macro/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-panel-macro/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-page-tree-macro/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-filter-by-label-macro/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-page-properties-report-macro/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-excerpt-macro/
- https://support.atlassian.com/confluence-cloud/docs/create-and-use-synced-blocks/
- https://support.atlassian.com/confluence-cloud/docs/learn-about-macros-on-confluence-mobile/
- https://support.atlassian.com/confluence-cloud/docs/faq-understanding-legacy-editor-deprecation/
- https://support.atlassian.com/confluence-cloud/docs/the-confluence-legacy-editor/
- https://support.atlassian.com/confluence-cloud/docs/use-folders-to-organize-your-work/
- https://support.atlassian.com/confluence-cloud/docs/get-started-with-smart-link-embeds/
- https://support.atlassian.com/confluence-cloud/docs/archive-pages/
- https://support.atlassian.com/confluence-cloud/docs/manage-your-content-tree/
- https://support.atlassian.com/confluence-cloud/docs/delete-restore-or-purge-a-page/
- https://support.atlassian.com/confluence-cloud/docs/manage-uploaded-files/
- https://support.atlassian.com/confluence-cloud/docs/comment-on-pages-and-blog-posts/
- https://support.atlassian.com/confluence-cloud/docs/disable-reactions/
- https://support.atlassian.com/confluence-cloud/docs/watch-pages-spaces-and-blogs/
- https://support.atlassian.com/confluence-cloud/docs/create-a-template/
- https://support.atlassian.com/confluence-cloud/docs/create-a-global-template/
- https://support.atlassian.com/confluence-cloud/docs/insert-the-create-from-template-macro/
- https://support.atlassian.com/confluence-cloud/docs/use-labels-to-organize-your-content/
- https://support.atlassian.com/confluence-cloud/docs/search-for-pages-and-posts/
- https://support.atlassian.com/confluence-cloud/docs/create-a-database/
- https://support.atlassian.com/confluence-cloud/docs/database-version-history/
- https://support.atlassian.com/confluence-cloud/docs/whiteboard-history/
- https://support.atlassian.com/confluence-cloud/docs/what-are-confluences-roles/
- https://support.atlassian.com/confluence-cloud/docs/what-are-confluence-cloud-permissions-and-restrictions/
- https://support.atlassian.com/confluence-cloud/docs/add-or-remove-page-restrictions/
- https://support.atlassian.com/security-and-access-policies/docs/prevent-data-export/
- https://support.atlassian.com/confluence-cloud/docs/export-content-to-word-pdf-html-and-xml/
- https://support.atlassian.com/confluence-cloud/docs/customize-exports-to-pdf/
- https://support.atlassian.com/confluence/kb/xml-export-end-of-life-confluence-cloud/
- https://support.atlassian.com/confluence-cloud/docs/import-content-into-confluence-cloud/
- https://support.atlassian.com/confluence-cloud/docs/import-data-from-notion-into-confluence/
- https://support.atlassian.com/confluence-cloud/docs/insert-confluence-wiki-markup/
- https://support.atlassian.com/confluence-cloud/docs/atlassian-intelligence-features-in-confluence-cloud/
- https://support.atlassian.com/confluence-cloud/docs/summarize-a-page-or-blog-using-atlassian-intelligence/
- https://support.atlassian.com/confluence-cloud/docs/create-new-content-items-with-rovo/
- https://support.atlassian.com/confluence-cloud/docs/create-ai-generated-slides-with-rovo/
- https://support.atlassian.com/confluence-cloud/docs/atlassian-intelligence-in-confluence-whiteboards/
- https://www.atlassian.com/software/confluence/features/whats-new
- https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ (ADF node list; shared by Jira and Confluence)
- https://marketplace.atlassian.com/apps/1227287/export-to-markdown-for-confluence-cloud (third-party Markdown export)
