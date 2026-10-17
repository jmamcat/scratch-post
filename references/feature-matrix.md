# Feature matrix

Rows are Quire features. Each row cites the reference features (IDs from each
`product/features.md`) that informed it and records the decision:

- **adopt**: take the baseline behaviour as is.
- **adapt**: take the idea, change the mechanics (reason given).
- **defer**: wanted, not in the change listed; stays a candidate.
- **reject**: deliberately out, with a reason.

`Change` is the change that ships it (`0001` = MVP foundation). Reference features not
cited here are untriaged; triage happens when a change touches their area.

## Storage and files

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Vault is a folder of `.md` files | adopt | 0001 | OBS-F-040 | | | JOP-F-001 | SB-F-001, SB-F-010 | Notion block JSON and Confluence ADF rejected as storage |
| Front matter properties | adopt | 0001 | OBS-F-100, OBS-F-101 | NOT-F-046 | CNF-F-032 | | SB-F-004 | Typed property editor deferred |
| External edits detected | adopt | 0001 | OBS-F-054 | | | JOP-F-007 | SB-F-031 | Local node watches its vault folder |
| Version history with restore | adapt | 0001 | OBS-F-156 | NOT-F-041 | CNF-F-057, CNF-F-059, CNF-F-060 | JOP-F-049, JOP-F-052 | SB-F-034 | Every revision kept; restore is a new revision like Confluence. Compare view deferred |
| Live-doc version grouping | defer | | | | CNF-F-065 | JOP-F-050 | | Collapse live revisions into sessions in history UI |
| Trash for deleted notes | defer | | OBS-F-049 | NOT-F-039 | CNF-F-051 | JOP-F-015 | | History already keeps deleted text |
| Rename with link update | defer | | OBS-F-042, OBS-F-058 | | | | | Needs rename tracking in sync |
| Attachments (paste, drop) | defer | | OBS-F-045, OBS-F-046 | NOT-F-021 | CNF-F-022 | JOP-F-023 | | Images by path render in 0001 |
| Blocks stored as JSON | reject | | | NOT-F-031, NOT-F-032 | CNF-F-119 | | | Markdown is the format |

## Editing and syntax

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Source editor + reading view | adapt | 0001 | OBS-F-002, OBS-F-003 | | | JOP-F-002 | | Live Preview (OBS-F-001, SB-F-002) deferred |
| Live Preview | adopt | 0002 | OBS-F-001, OBS-F-211 | NOT-F-030 | CNF-F-002 | | SB-F-002 | Default editing mode, as in Obsidian; source mode one command away |
| Wikilinks, headings, block refs | adopt | 0001 | OBS-F-004, OBS-F-006, OBS-F-007 | NOT-F-067, NOT-F-070 | CNF-F-024 | JOP-F-006 | SB-F-003 | |
| Markdown internal links | adopt | 0001 | OBS-F-005 | | | | | |
| Image embeds | adopt | 0001 | OBS-F-009 | NOT-F-021 | CNF-F-022 | | | |
| Note transclusion `![[note]]` | defer | | OBS-F-008 | NOT-F-026 | CNF-F-028, CNF-F-030 | | | Rendered as an embed card in 0001 |
| Callouts and foldable callouts | adopt | 0001 | OBS-F-012 | NOT-F-006, NOT-F-008 | CNF-F-013, CNF-F-014 | | | Covers Notion toggles and Confluence panels/expand |
| Highlights, comments, footnotes, strikethrough | adopt | 0001 | OBS-F-013, OBS-F-014, OBS-F-015, OBS-F-017 | NOT-F-017 | CNF-F-007 | JOP-F-004 | | |
| Task lists | adopt | 0001 | OBS-F-016 | NOT-F-005 | CNF-F-009 | JOP-F-008 | SB-F-005 | Reminders rejected |
| Tables (GFM) | adopt | 0001 | OBS-F-020 | NOT-F-013 | CNF-F-012 | | | Merged cells (NOT-F-014) rejected |
| Math | defer | | OBS-F-018 | NOT-F-012 | | JOP-F-004 | | Needs KaTeX bundle decision |
| Mermaid | defer | | OBS-F-019 | NOT-F-011 | CNF-F-037 | JOP-F-004 | | |
| Raw HTML | reject | 0001 | OBS-F-022 | NOT-F-028 | | JOP-F-005 | | Escaped for safety (R-RND-06); revisit with a sanitizer |
| Slash menu | defer | | OBS-F-080 | NOT-F-029 | CNF-F-003 | | | Top Notion parity item for the next change |
| Block drag handles | reject | | | NOT-F-031 | CNF-F-004 | | | Text editor, not block editor |
| Columns, tabs, colors | reject | | | NOT-F-015, NOT-F-016, NOT-F-018 | CNF-F-021 | | | Not representable in Markdown |
| Status lozenge, date element, mentions | defer | | | NOT-F-033, NOT-F-071 | CNF-F-017, CNF-F-018, CNF-F-019 | | | Candidate inline syntax later |
| Templates with variables | defer | | OBS-F-084 | NOT-F-080 | CNF-F-081, CNF-F-084 | | | |

## Navigation

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| File tree | adopt | 0001 | OBS-F-067 | NOT-F-035, NOT-F-036 | CNF-F-044, CNF-F-046 | JOP-F-013 | | Folders as Confluence page tree |
| Backlinks and outgoing links | adopt | 0001 | OBS-F-061, OBS-F-072 | NOT-F-069 | | | SB-F-003 | |
| Outline | adopt | 0001 | OBS-F-073 | NOT-F-025 | CNF-F-026 | | | |
| Tags (inline + front matter, nested) | adopt | 0001, 0002 | OBS-F-024, OBS-F-083 | | CNF-F-088 | JOP-F-014 | SB-F-011 | 0002 adds the tags view |
| Offline full-text search | adapt | 0001, 0002 | OBS-F-079, OBS-F-130, OBS-F-131, OBS-F-132 | NOT-F-072 | CNF-F-090 | JOP-F-019 | SB-F-015 | 0002 adds path:, file:, tag:, quotes and -exclude; regex deferred |
| Quick switcher | adopt | 0001 | OBS-F-077 | NOT-F-072 | | JOP-F-020 | SB-F-006 | |
| Command palette | adopt | 0001 | OBS-F-065 | | | | SB-F-006 | |
| Daily notes | adopt | 0001 | OBS-F-066 | NOT-F-081 | | | | |
| Graph view (global and local) | adopt | 0002 | OBS-F-070, OBS-F-140, OBS-F-141 | | | | | Filters and groups deferred |
| Bookmarks / favorites | defer | | OBS-F-063 | NOT-F-036 | CNF-F-055 | | | |
| Page preview on hover | defer | | OBS-F-074 | NOT-F-073 | | | | |

## Views and appearance (0002)

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Interactive task checkboxes | adopt | 0002 | OBS-F-016 | NOT-F-005 | CNF-F-009 | JOP-F-008 | SB-F-005 | Reading view and Live Preview |
| Editable properties | adopt | 0002 | OBS-F-075, OBS-F-100, OBS-F-101 | NOT-F-046 | CNF-F-032 | | SB-F-004 | Text, number, checkbox, date, list |
| Recently opened | adopt | 0002 | OBS-F-077 | NOT-F-036 | CNF-F-055 | | | Per device |
| Changes view (vault-wide) | adapt | 0002 | OBS-F-157 | NOT-F-041 | CNF-F-057 | JOP-F-049 | SB-F-034 | From the revision log, cached offline |
| Domain view (by topic) | adapt | 0002 | | NOT-F-037 | CNF-F-041 | JOP-F-013 | SB-F-011 | Quire's own: groups by property, journal, tag, folder; like Confluence spaces without moving files |
| Timeline view | adapt | 0002 | | NOT-F-054 | | | | Buckets by last change |
| Themes with distinct headings | adapt | 0002 | OBS-F-214, OBS-F-217 | NOT-F-019 | CNF-F-039 | JOP-F-069 | | Five built-in themes; CSS snippets deferred |

## Structured data

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Board view grouped by a property | adapt | 0002 | OBS-F-111 | NOT-F-052 | CNF-F-052 | | | A sidebar view; full Bases-style table views still deferred |
| Database views over front matter (table) | defer | | OBS-F-062, OBS-F-110 | NOT-F-044, NOT-F-051 | CNF-F-092, CNF-F-093 | | SB-F-012 | Obsidian Bases `.base` format is the candidate |
| Calendar, timeline, chart, map views | reject | | | NOT-F-053, NOT-F-054, NOT-F-056, NOT-F-057 | CNF-F-036 | | | Feature-lean |
| Formulas, relations, rollups | defer | | OBS-F-113 | NOT-F-048, NOT-F-049 | | | | Only if Bases lands |
| Canvas | defer | | OBS-F-064, OBS-F-120 | | CNF-F-094 | JOP-F-010 | | JSON Canvas is open |
| Forms, automations, buttons | reject | | | NOT-F-027, NOT-F-063, NOT-F-064 | CNF-F-122 | | | |

## Sync, offline and collaboration

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Full local copy, offline edit and create | adopt | 0001 | OBS-F-163 | NOT-F-090 (partial) | CNF-F-113, CNF-F-115 (partial) | JOP-F-027 | SB-F-017 | Notion and Confluence only keep opened pages offline; Quire keeps everything |
| Revision-based sync with change feed | adapt | 0001 | OBS-F-150 | | | JOP-F-028, JOP-F-032 | SB-F-021, SB-F-022, SB-F-023 | Revisions and hashes, not timestamps (Joplin lesson) |
| Three-way merge on reconnect | adopt | 0001 | OBS-F-152, OBS-F-155 | NOT-F-093 | CNF-F-114 | JOP-F-042, JOP-F-043 | SB-F-024, SB-F-025 | Word-level pass inside colliding hunks, like SilverBullet |
| Per-property front matter merge | adapt | 0001 | OBS-F-100 | NOT-F-093 | | | | Notion keeps one side; Quire flags it |
| Conflict review cards | adapt | 0001 | | | CNF-F-114, CNF-F-059 | JOP-F-040, JOP-F-047 | SB-F-026, SB-F-027 | Not conflict copies (Joplin) and not in-file markers (SilverBullet): a review inbox with per-hunk choices |
| Delete never beats an edit | adopt | 0001 | | | | | SB-F-029 | |
| Wipe-out fail-safe | defer | | | | | JOP-F-035 | SB-F-030 | Refuse mass deletes from a device that looks empty |
| Real-time co-editing | adopt | 0001 | | NOT-F-074 | CNF-F-068, CNF-F-069 | | | Yjs rooms; presence via awareness |
| Comments | defer | | | NOT-F-075 | CNF-F-071, CNF-F-073 | | | Stored beside the file, never inside it |
| Local node / headless server | adapt | 0001 | OBS-F-166 | | | JOP-F-028 | SB-F-036 | Local node replicates with the cloud |
| End-to-end encryption | defer | | OBS-F-151 | | | JOP-F-054 | SB-F-019 | |
| Sharing and permissions | reject | | OBS-F-164 | NOT-F-077 | CNF-F-096, CNF-F-097, CNF-F-098 | JOP-F-058 | | Single-user MVP; one optional token |
| Publish to web | defer | | OBS-F-076, OBS-F-170 | NOT-F-078 | | JOP-F-060 | | |

## Platforms

| Quire feature | Decision | Change | Obsidian | Notion | Confluence | Joplin | SilverBullet | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web client | adopt | 0001 | | | CNF-F-001 | JOP-F-062 | SB-F-016 | |
| Android app (Capacitor) | adapt | 0001 | OBS-F-180, OBS-F-184 | NOT-F-095 | CNF-F-116 | | | Web build in a WebView, IndexedDB storage |
| Mobile editing toolbar | defer | | OBS-F-181 | NOT-F-096 | | | SB-F-008 | |
| Installable PWA | defer | | | | | | SB-F-016 | |
| Plugins | reject | | OBS-F-190 | NOT-F-103 | CNF-F-120 | JOP-F-063 | SB-F-038 | Lean core first |
| AI features | reject | | | NOT-F-105 to NOT-F-110 | CNF-F-124 to CNF-F-129 | JOP-F-068 | | Out of scope for a lean store and renderer |
