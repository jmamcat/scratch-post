# Obsidian: data model

Storage format, document model and sync model, as documented in obsidian-help `08ef563f` and obsidian-api `9abd9605`. Paths in "Source" cells are relative to `upstream/obsidian-help/` unless prefixed `obsidian-api:`. Anything not stated by those sources is marked "(unverified)".

## 1. Vault

- A **vault** is a folder on the local file system, including all subfolders. Notes are Markdown plain-text files (`.md`). The vault name is the folder name; renaming the vault renames the folder.
- Other files in the vault are attachments if their type is accepted: `.base`, `.canvas`, images (`avif bmp gif jpeg jpg png svg webp`), audio (`flac m4a mp3 ogg wav webm 3gp`), video (`mkv mov mp4 ogv webm`), `pdf`. "Show all file types" lets other extensions appear and be linked.
- Paths inside a vault always use `/`, even on Windows, and are vault-root-relative with no leading slash. `normalizePath` turns `\` into `/`, strips leading and trailing `/`, collapses `//`, and converts U+00A0 and U+202F to a plain space.
- Obsidian watches the folder and refreshes when files change externally.
- Vaults inside vaults are discouraged: links are vault-local and may not update.
- Filenames follow host OS limits. Characters `# | ^ : %% [[ ]]` in a name may break links.
- Hidden files and folders (leading `.`) are not shown and are not synced, except the config folder.
- Deleted files go to the OS trash by default; alternatives: `<vault>/.trash/` or permanent delete.

Sources: `en/Files and folders/How Obsidian stores data.md`, `en/Files and folders/Manage vaults.md`, `en/Files and folders/Accepted file formats.md`, `en/Files and folders/Manage notes.md`, `en/Linking notes and files/Internal links.md`, `obsidian-api: obsidian.d.ts normalizePath`.

## 2. Configuration folder `.obsidian/`

Created at the vault root; holds per-vault settings. Name can be overridden (must start with `.`, e.g. `.obsidian-mobile`) to create settings profiles. Settings are JSON files.

| Path | Contents | Status |
| --- | --- | --- |
| `.obsidian/appearance.json` | Theme, color scheme, fonts, enabled snippets | documented (name) |
| `.obsidian/workspace.json`, `.obsidian/workspace-mobile.json` | Current pane layout, open files, ribbon layout; rewritten on every file open (suggest `.gitignore`) | documented |
| `.obsidian/workspaces.json` | Saved layouts (Workspaces plugin) | documented |
| `.obsidian/snippets/*.css` | CSS snippets | documented |
| `.obsidian/themes/<name>/` | Installed themes (`manifest.json`, `theme.css`) | folder documented; contents unverified |
| `.obsidian/plugins/<id>/` | Community plugin `manifest.json`, `main.js`, `styles.css`, `data.json` (plugin settings via `loadData`/`saveData`) | folder documented; contents from obsidian-api README and app (unverified for `data.json` name) |
| `.obsidian/app.json` | Editor and Files and links settings | unverified |
| `.obsidian/core-plugins.json` | Enabled core plugins | unverified |
| `.obsidian/community-plugins.json` | Enabled community plugin IDs | unverified |
| `.obsidian/hotkeys.json` | Custom hotkeys | unverified |
| `.obsidian/types.json` | Vault-wide property name to type map | unverified |
| `.obsidian/graph.json`, `bookmarks.json`, `daily-notes.json`, `templates.json` | Per-plugin settings | unverified |

**Global (not per-vault) settings** live in the OS app-data folder: macOS `~/Library/Application Support/obsidian`, Windows `%APPDATA%\Obsidian\`, Linux `$XDG_CONFIG_HOME/obsidian/` or `~/.config/obsidian/`. File recovery snapshots live here (keyed by absolute note path), so they are device-local and never synced. The vault list is also stored here (unverified).

**Metadata cache** lives in IndexedDB (desktop and mobile), is rebuildable from files ("Rebuild vault cache"), and holds per-file `CachedMetadata` (section 5).

Sources: `en/Files and folders/Configuration folder.md`, `en/Files and folders/How Obsidian stores data.md`, `en/User interface/Settings.md`, `en/User interface/Ribbon.md`, `en/Teams/Deploy Obsidian across your team.md`, `en/Plugins/File recovery.md`, `obsidian-api: README.md`.

## 3. Properties (frontmatter)

### Format

- YAML block at the very start of the file between two `---` lines. A JSON object between `---` lines is also accepted and is rewritten as YAML on save.
- `name: value` pairs; order irrelevant; each name unique per note.
- Nested objects are not supported in the properties UI (visible only in Source mode). Markdown in values is not rendered. Hashtags in text values are not tags.
- Links in values must be quoted: `link: "[[Episode IV]]"`. Such links are indexed (`frontmatterLinks`) and count in backlinks and Bases `file.links`.
- Display in the editor: Visible (default), Hidden, or Source (raw YAML).

### Types

The type is chosen once per property **name** and applies vault-wide.

| Type | YAML encoding | Notes |
| --- | --- | --- |
| Text | `title: A New Hope` | Single line. May contain a URL or a quoted `"[[link]]"`. |
| List | `cast:` then `  - Mark Hamill` lines | Items may be text, numbers, quoted links. |
| Number | `year: 1977`, `pie: 3.14` | Literal only, no expressions. |
| Checkbox | `favorite: true` / `false` | Empty value is indeterminate, often treated as false. |
| Date | `date: 2020-08-21` | `YYYY-MM-DD`. With Daily notes on, renders as a link to that day's note. |
| Date & time | `time: 2020-08-21T10:30:00` | ISO 8601 local time, no zone. |
| Tags | `tags:` then `  - journal` lines | Only for the `tags` property. Values without `#`. |

Default properties: `tags` (list), `aliases` (list), `cssclasses` (list). Publish properties: `publish`, `permalink`, `description`, `image`, `cover`. Deprecated names `tag`, `alias`, `cssclass` lost default-property support in 1.9 (Format converter migrates them).

Internal type identifiers in `types.json` (unverified): `text`, `multitext` (List), `number`, `checkbox`, `date`, `datetime`, `tags`, `aliases`.

Plugins edit frontmatter atomically with `FileManager.processFrontMatter(file, fn)`, which throws `YAMLParseError` on invalid YAML.

Sources: `en/Editing and formatting/Properties.md`, `en/Editing and formatting/Tags.md`, `en/Linking notes and files/Aliases.md`, `obsidian-api: obsidian.d.ts CachedMetadata.frontmatter, frontmatterLinks, FileManager.processFrontMatter`.

## 4. Links: resolution, generation, renames

Terminology from obsidian-api: **linktext** = `path#subpath`; **linkpath** = the path part; **subpath** = `#Heading`, `#H1#H2`, or `#^blockid`.

### Resolution (link to file)

1. Split linktext at the first `#` into linkpath and subpath (`parseLinktext`, `getLinkpath`). Strip `|display` first for wikilinks. For Markdown links, percent-decode the destination (or take `<...>` literally).
2. Empty linkpath (`[[#Heading]]`, `[[#^id]]`) targets the current file.
3. A linkpath without an extension targets a Markdown file (`.md` implied). Non-Markdown targets must include the extension (`[[Figure 1.png]]`).
4. `getFirstLinkpathDest(linkpath, sourcePath)` returns the best match. The API example for `foo/bar` from `baz/qux.md` returns `baz/foo/bar.md` (relative to the source folder) or `some/other/path/foo/bar.md` (any file whose path ends with the linkpath). Docs state folder paths in links start at the vault root. Implementer reading: try (a) exact vault-root path, (b) path relative to the source file's folder, (c) any file whose path ends with `/linkpath` or whose name equals it.
5. Ambiguity (several files share the basename): Obsidian prefers a match in the source file's folder, then the shortest path (unverified). Matching is case-insensitive (unverified, observed).
6. No match: the link is **unresolved**, kept in `MetadataCache.unresolvedLinks`, rendered with a distinct style, and clicking it creates the note (at the folder path in the link if given, else at "Default location for new notes").
7. Aliases are not resolution targets. Choosing an alias in the suggester writes `[[Target|Alias]]`. A bare `[[Alias]]` stays unresolved (unverified).
8. Subpath resolution: `#Heading` matches heading text; `#H1#H2` walks nested headings; `#^id` matches a block ID. `resolveSubpath` returns heading, block, or footnote results.

### Generation (file to linktext)

- "New link format" setting: **Shortest path when possible** (default, unverified), Relative path to file, Absolute path in vault.
- Shortest path = `fileToLinktext`: the bare filename if it is unique in the vault, else the full vault path. `.md` is omitted.
- "Use [[Wikilinks]]" on (default): `[[target]]`, `![[target]]`. Off: `[text](url%20encoded.md)`, `![](...)`.
- Picking an alias writes `[[Target|Alias]]` for compatibility with other wikilink tools.

### Rename and move

- `FileManager.renameFile(file, newPath)` renames or moves and updates all links to it per settings. With "Automatically update internal links" on, links in every referencing note are rewritten in place; with it off, the user is prompted.
- `MetadataCache` does not emit `changed` on rename; consumers must listen to `Vault.on('rename', (file, oldPath))`.
- Links inside the moved file that are relative paths are rewritten so they keep pointing at the same targets (unverified). Frontmatter links are updated too (unverified).

### Index structures

- `resolvedLinks: Record<sourcePath, Record<destPath, count>>`.
- `unresolvedLinks: Record<sourcePath, Record<linktext, count>>`.
- Backlinks of X = all sources whose `resolvedLinks` contain X. Unlinked mentions = plain-text occurrences of X's name or aliases in other notes (excluded files skipped).

Sources: `en/Linking notes and files/Internal links.md`, `en/Linking notes and files/Aliases.md`, `en/User interface/Settings.md`, `en/Plugins/Backlinks.md`, `obsidian-api: obsidian.d.ts MetadataCache, FileManager, parseLinktext, getLinkpath, resolveSubpath`.

## 5. Document model (metadata cache)

`CachedMetadata` per Markdown file, all positions as `{start,end}` with line, col, offset:

| Field | Extracted from |
| --- | --- |
| `links` | `[[wikilink]]`, `[[wikilink\|alias]]`, `[alias](markdown-link)` |
| `embeds` | `![[wikilink]]`, `![[wikilink\|alias]]`, `![alias](markdown-link)` |
| `tags` | Inline `#tags` (frontmatter tags are in `frontmatter`) |
| `headings` | ATX headings with level |
| `sections` | Root-level blocks, `type` one of `blockquote`, `callout`, `code`, `element`, `footnoteDefinition`, `heading`, `html`, `list`, `paragraph`, `table`, `text`, `thematicBreak`, `yaml` (non-exhaustive) |
| `listItems` | Each list item: `parent` line (negative for root lists), optional block `id`, `task` status char (`' '` = open, any other char = done, `undefined` = not a task) |
| `blocks` | Block IDs (`foo ^bar` gives id `bar`) |
| `footnotes`, `footnoteRefs` | Footnote definitions and references (1.6.6, 1.8.7) |
| `referenceLinks` | `[google]` with `[google]: https://...` definitions (1.8.7) |
| `frontmatter`, `frontmatterPosition`, `frontmatterLinks` | YAML properties, their range, links inside them |

Source: `obsidian-api: obsidian.d.ts CachedMetadata, ListItemCache, SectionCache, BlockCache`.

## 6. Obsidian Flavored Markdown (OFM)

Base: CommonMark + GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks) + LaTeX math via MathJax. OFM adds the constructs below. "Context: skip code" means the construct is not recognised inside inline code spans or fenced/indented code blocks.

### 6.1 Syntax table (additions and deviations)

| # | Construct | Syntax | Level | Parse rules | Render | Source |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Frontmatter | `---` on line 1, YAML lines, closing `---` | block, file start only | Must start at byte 0 of the file. Ends at the next line that is exactly `---`. Content is YAML (or a JSON object). Not part of the Markdown body. | Properties table (Visible), hidden, or raw YAML | `en/Editing and formatting/Properties.md` |
| 2 | Wikilink | `[[path]]`, `[[path#Heading]]`, `[[path#H1#H2]]`, `[[path#^blockid]]`, `[[#Heading]]`, `[[path\|display]]` | inline, skip code | Opens at `[[`, closes at first `]]`. Inner text: `linktext` then optional `\|display` (first `\|`). `linktext` = `path` then optional subpath beginning at first `#`; `#^` starts a block ref. Inside a GFM table cell the pipe must be written `\|`. | `<a>` to the resolved file; text = display if given, else linktext as written; unresolved style if no target | `en/Linking notes and files/Internal links.md` |
| 3 | Embed (wikilink) | `![[path]]`, `![[path#Heading]]`, `![[path#^id]]` | inline (block when alone on a line), skip code | `!` immediately before `[[`. Same inner grammar as wikilink. | Transcluded content of the note, heading section, or block; live-updating | `en/Linking notes and files/Embed files.md` |
| 4 | Image embed size | `![[img.png\|W]]`, `![[img.png\|WxH]]` | inline | For image targets, the `\|` part is `W` or `WxH` in integer pixels. Width only keeps aspect ratio. | `<img width height>` | `en/Linking notes and files/Embed files.md` |
| 5 | Markdown image size | `![alt\|WxH](url)`, `![alt\|W](url)`, `![W](url)` | inline | Size parsed from the alt text after the last `\|`, or alt text that is only digits. Applies to external URLs and vault paths. | `<img>` with size | `en/Editing and formatting/Basic formatting syntax.md`, `en/Linking notes and files/Embed files.md` |
| 6 | PDF embed params | `![[doc.pdf#page=3]]`, `#height=400`, `#page=3&height=400` | inline | Subpath on a `.pdf` target is `key=value` pairs joined by `&`. | PDF viewer at page, given pixel height | `en/Linking notes and files/Embed files.md` |
| 7 | Base embed | `![[file.base]]`, `![[file.base#View name]]` | block | Subpath names a view; default is the first view. | Base view | `en/Bases/Create a base.md` |
| 8 | Other embeds | `![[audio.mp3]]`, `![[video.mp4]]`, `![[board.canvas]]` | block | By file extension. Canvas embed shows shapes only. | Player / canvas preview | `en/Linking notes and files/Embed files.md` |
| 9 | Markdown internal link | `[text](Note.md)`, `[text](Folder/My%20Note.md#Heading)`, `[text](<My Note.md>)` | inline | Destination without a URL scheme is a vault path. Percent-decode, or take `<...>` literally. `.md` optional. Same resolution as wikilinks. | `<a>` to resolved file | `en/Linking notes and files/Internal links.md` |
| 10 | Block ID | `text ^my-id` (end of paragraph or list item); or `^my-id` on its own line after a list, quote, callout, or table, with a blank line before and after | block suffix | ID matches `[A-Za-z0-9-]+` and is preceded by a space (or is alone on its line). Line-end form applies to the paragraph or list item it ends. Standalone form applies to the preceding structured block. Links to parts of quotes, callouts, tables are unsupported. | ID text hidden in Reading view (unverified); anchor for `#^my-id` | `en/Linking notes and files/Internal links.md` |
| 11 | Tag | `#tag`, `#nested/tag`, `#y1984` | inline, skip code | `#` followed by one or more of: Unicode letters, digits, `_`, `-`, `/`, emoji and other common Unicode symbols. Must contain at least one non-digit (`#1984` is not a tag). No spaces. Must be at line start or after whitespace (unverified). `# ` (hash + space) at line start is a heading, not a tag. Case-insensitive identity. | Clickable tag pill; opens search `tag:#tag` | `en/Editing and formatting/Tags.md` |
| 12 | Comment (inline) | `%%hidden%%` | inline | Both markers on one line. Allowed anywhere, including headings, list items, bold text. `\%%` or a code span shows literal `%%`. | Removed in Reading view and Publish; shown in editing view | `en/Editing and formatting/Basic formatting syntax.md` |
| 13 | Comment (block) | line starting with `%%` ... next `%%` | block | Starts when a line begins with `%%`; ends at the next `%%` (may span blank lines and contain any Markdown). Text after the closing `%%` on the same line is rendered. An unclosed block hides the rest of the note. | Removed in Reading view | `en/Editing and formatting/Basic formatting syntax.md` |
| 14 | Highlight | `==text==`, `==🔴text==` | inline, skip code | Delimiter `==`, flanking rules like `~~` (unverified). Optional color emoji immediately after opening `==`: 🔴 red, 🟠 orange, 🟡 yellow, 🟢 green, 🔵 blue, 🟣 purple. No emoji = theme default. | `<mark>`, colored variant; emoji not shown (unverified) | `en/Editing and formatting/Basic formatting syntax.md` |
| 15 | Strikethrough | `~~text~~` | inline | GFM. | `<del>` / `<s>` | `en/Editing and formatting/Basic formatting syntax.md` |
| 16 | Callout | `> [!type]`, `> [!type] Title`, `> [!type]+ Title`, `> [!type]- Title` then `> body` lines | block | A blockquote whose first line starts with `[!type]`. `type` is case-insensitive, letters and `-` (custom types allowed). `+` = foldable, expanded; `-` = foldable, collapsed; none = not foldable. Title = rest of first line; if empty, title = type in title case. Body = remaining blockquote lines (full Markdown, links, embeds). Nest with `> >`. Title-only callouts allowed. | `<div class="callout" data-callout="type">` with icon, title, body; unknown type styled as `note` | `en/Editing and formatting/Callouts.md` |
| 17 | Callout types | `note`; `abstract` (`summary`, `tldr`); `info`; `todo`; `tip` (`hint`, `important`); `success` (`check`, `done`); `question` (`help`, `faq`); `warning` (`caution`, `attention`); `failure` (`fail`, `missing`); `danger` (`error`); `bug`; `example`; `quote` (`cite`) | n.a. | 13 base types, aliases in parentheses map to the base type style. | Per-type color and Lucide icon | `en/Editing and formatting/Callouts.md` |
| 18 | Task item | `- [ ] open`, `- [x] done`, `- [?] other` | list item | GFM task list item, but any single character between brackets is a status. `' '` = open; any other char = completed. Status char preserved in source. Also valid with `*`, `+`, ordered markers (unverified). | Checkbox; toggling in Reading view writes `x` or space | `en/Editing and formatting/Basic formatting syntax.md`, `obsidian-api: ListItemCache.task` |
| 19 | Footnote | ref `[^1]` or `[^name]`; def `[^1]: text` with continuation lines indented 2 spaces; inline `^[text]` | inline ref, block def | Labels may be names; output is numbered by order. Inline footnotes render only in Reading view, not Live Preview. | Superscript number linking to a footnotes section | `en/Editing and formatting/Basic formatting syntax.md` |
| 20 | Math | inline `$e^{i\pi}$`; block `$$` ... `$$` | inline / block, skip code | MathJax TeX input. Inline: `$...$` on one line, no space just inside the delimiters (unverified). Block: `$$` delimiters, may be on own lines. | MathJax output | `en/Editing and formatting/Advanced formatting syntax.md` |
| 21 | Mermaid | fenced code with info string `mermaid` | block | Mermaid source. Nodes given class `internal-link` (e.g. `class A,B internal-link;`) become internal links to notes named by the node text. | SVG diagram | `en/Editing and formatting/Advanced formatting syntax.md` |
| 22 | Search embed | fenced code with info string `query` | block | Body is a search query (section 9 syntax). | Live search results list | `en/Plugins/Search.md` |
| 23 | Inline base | fenced code with info string `base` | block | Body is `.base` YAML (section 8). | Base view | `en/Bases/Create a base.md` |
| 24 | Code highlighting | fenced code with language | block | Reading view uses Prism languages; editing views use a different highlighter. | Highlighted `<pre><code>` | `en/Editing and formatting/Basic formatting syntax.md` |
| 25 | Line breaks | single newline inside a paragraph | inline | Deviation: with "Strict line breaks" off (default, unverified), a single newline renders as `<br>`. With it on, CommonMark soft break (space). Two trailing spaces or `Shift+Enter` always break. | `<br>` | `en/User interface/Settings.md`, `en/Editing and formatting/Basic formatting syntax.md` |
| 26 | HTML | raw HTML blocks and inline tags | block / inline | Deviation: Markdown inside HTML elements is never rendered. HTML blocks must not contain blank lines. Output is sanitized (no `<script>`, etc.). `<iframe>` allowed. | Sanitized HTML | `en/Editing and formatting/HTML content.md`, `en/Editing and formatting/Embed web pages.md` |
| 27 | YouTube embed | `![](https://www.youtube.com/watch?v=ID)` | inline | Image syntax with a YouTube URL. | Embedded player | `en/Editing and formatting/Embed web pages.md` |
| 28 | Slide separator | `---` on its own line with blank lines around | block | Only meaningful to the Slides plugin; otherwise a thematic break. | New slide | `en/Plugins/Slides.md` |
| 29 | Escapes | `\*`, `\_`, `\#`, `` \` ``, `\|`, `\~`, `1\.` | inline | CommonMark backslash escapes; `\|` needed inside tables for wikilink display or image size. | Literal char | `en/Editing and formatting/Basic formatting syntax.md`, `en/Editing and formatting/Advanced formatting syntax.md` |
| 30 | Editor-only link search | `[[## term`, `[[^^term` | editor input | Autocomplete triggers that search headings or blocks across the vault; never stored. | n.a. | `en/Linking notes and files/Internal links.md` |

### 6.2 Notes for implementers

- Whitespace collapses in Reading view; use `&nbsp;` or `<br>` to keep spaces.
- Headings: ATX `#` to `######`. The inline title (filename) is not a heading in the file.
- Lists: `-`, `*`, `+` bullets; `1.` or `1)` ordered; nest by indenting; tab or 4 spaces by setting.
- Thematic break: `***`, `---`, `___` (3 or more, spaces allowed). Note line 1 `---` starts frontmatter instead.
- Code fences: 3 or more backticks or tildes; outer fence must be longer or use the other character to nest.
- The same file must stay valid CommonMark. Obsidian-only syntax shows as text elsewhere.

## 7. JSON Canvas (`.canvas`)

Open format (jsoncanvas.org). A UTF-8 JSON file. Types from `obsidian-api/canvas.d.ts`:

```ts
CanvasData   { nodes: Node[]; edges: Edge[]; [key: string]: any }
Node (common){ id: string; x: number; y: number; width: number; height: number; color?: Color; [k]: any }
  text  node { type: "text";  text: string }                       // Markdown
  file  node { type: "file";  file: string; subpath?: string }     // vault path; subpath starts with "#"
  link  node { type: "link";  url: string }
  group node { type: "group"; label?: string; background?: string; backgroundStyle?: "cover" | "ratio" | "repeat" } // default "cover"
Edge         { id: string; fromNode: string; fromSide?: Side; fromEnd?: End; toNode: string; toSide?: Side; toEnd?: End;
               color?: Color; label?: string; [k]: any }
Side = "top" | "right" | "bottom" | "left";  End = "none" | "arrow"   // fromEnd default "none", toEnd default "arrow"
Color = "1".."6" preset or "#RRGGBB" hex
```

- Preset colors (per JSON Canvas spec, unverified here): 1 red, 2 orange, 3 yellow, 4 green, 5 cyan, 6 purple.
- Node array order is z-order, first is bottom (spec, unverified here).
- Unknown keys must be preserved (types allow arbitrary keys for forward compatibility).
- Obsidian sync treats `.canvas` as non-Markdown: last modified wins on conflict.
- Links inside text nodes are not backlinks.

Minimal example:

```json
{
  "nodes": [
    {"id": "a1", "type": "text", "text": "# Idea", "x": 0, "y": 0, "width": 250, "height": 60},
    {"id": "b2", "type": "file", "file": "Projects/Plan.md", "subpath": "#Goals", "x": 400, "y": 0, "width": 400, "height": 300, "color": "4"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a1", "fromSide": "right", "toNode": "b2", "toSide": "left", "label": "expands"}
  ]
}
```

Sources: `obsidian-api: canvas.d.ts`, `en/Plugins/Canvas.md`, `en/Files and folders/Accepted file formats.md`, `en/Obsidian Sync/Troubleshoot Obsidian Sync.md`.

## 8. Bases (`.base`)

A `.base` file (or a ` ```base ` code block) is YAML. Data is never stored in the base; it queries files and their frontmatter.

```yaml
filters:            # optional; string or {and|or|not: [filter, ...]} tree; none = every file in vault
  and:
    - file.hasTag("book")
    - 'status != "done"'
formulas:           # name -> expression string
  ppu: "(price / age).toFixed(2)"
properties:         # per-property display config
  status: { displayName: Status }
  formula.ppu: { displayName: "Price per unit" }
summaries:          # custom summary formulas; `values` = list of column values
  customAverage: 'values.mean().round(3)'
views:              # list; first is default
  - type: table     # table | cards | list | kanban | map | plugin-defined
    name: "My table"
    limit: 10
    filters: { or: ["formula.ppu > 5", "price > 2.1"] }   # ANDed with global filters
    groupBy: { property: note.status, direction: ASC }      # ASC | DESC
    groupOrder: [Planned, "In progress", Done, null]       # optional; null = files with no value
    order: [file.name, note.age, formula.ppu]               # visible properties in column order
    summaries: { formula.ppu: Average }
    # views may store extra layout-specific keys
```

- **Property namespaces:** `note.x` or bare `x` (frontmatter), `file.x` (file metadata), `formula.x`. File properties: `backlinks`, `ctime`, `embeds`, `ext`, `file`, `folder`, `links`, `mtime`, `name`, `path`, `properties`, `size`, `tags`.
- **`this`:** the base file (opened directly), the embedding file (embedded), or the active file (sidebar).
- **Operators:** arithmetic `+ - * / %` and `( )`; comparison `== != > < >= <=`; boolean `! && ||`. Date plus or minus duration strings (`"1M"`, `"2h"`, `"7d"`, units `y M d w h m s` and long forms). Date minus date = milliseconds.
- **Literals:** strings in single or double quotes (nested inside YAML quotes), numbers, `true`/`false`.
- **Types:** string, number, boolean, date, duration, list (0-based `[i]`), object (`.key` or `["key"]`), link, file, null. Quoted wikilinks in frontmatter are Link values. Links equal when they resolve to the same file.
- **Functions:** global `date() duration() file() html() if() image() icon() link() list() max() min() now() number() today() random() escapeHTML()`; any `isTruthy() isType() toString()`; date fields plus `date() format() time() relative() isEmpty()`; string `contains() containsAll() containsAny() endsWith() isEmpty() lower() replace() repeat() reverse() slice() split() startsWith() title() trim()`; number `abs() ceil() floor() isEmpty() round() toFixed()`; list `contains() containsAll() containsAny() filter() flat() isEmpty() join() map() reduce() reverse() slice() sort() unique()`; link `asFile() linksTo()`; file `asLink() hasLink() hasProperty() hasTag() inFolder()`; object `isEmpty() keys() values()`.
- **Default summaries:** Average, Min, Max, Sum, Range, Median, Stddev (number); Earliest, Latest, Range (date); Checked, Unchecked (boolean); Empty, Filled, Unique (any).
- `file.hasTag("a")` matches `#a` and `#a/b`.

Sources: `en/Bases/Bases syntax.md`, `en/Bases/Functions.md`, `en/Bases/Views.md`, `en/Bases/Create a base.md`, `en/Editing and formatting/Tags.md`.

## 9. Search query syntax (used by search pane and `query` blocks)

Words are ANDed; `OR`; `-term` negation; `( )` grouping; `"exact phrase"` with `\"` escapes; `/regex/`; operators `file: path: content: match-case: ignore-case: tag: line: block: section: task: task-todo: task-done:` (some take a parenthesised sub-query); property filters `[prop]`, `[prop:value]`, `[prop:null]`, `[prop:A OR B]`, `[num:>5]`. Case-insensitive by default. `tag:#work` does not match `#myjob/work`.

Source: `en/Plugins/Search.md`.

## 10. Attachments

- "Default location for new attachments": **Vault folder** (default, documented), In the folder specified below, Same folder as current file, In subfolder under current folder (created on demand).
- Paste or drag-and-drop copies the file to that location and inserts an embed (`![[name.ext]]` with wikilinks on).
- `FileManager.getAvailablePathForAttachment(filename, sourcePath)` creates the parent folder if needed and de-duplicates the name if taken.
- Pasted images are named `Pasted image YYYYMMDDHHmmss.png` (unverified).
- Attachments are ordinary files; Sync keeps attachment versions 2 weeks.

Sources: `en/Editing and formatting/Attachments.md`, `obsidian-api: obsidian.d.ts FileManager`.

## 11. Obsidian Sync model

### Topology

- One **remote vault** per synced vault; each device holds a **local vault** that uploads and downloads changes. Tracking is per file; only changed files transfer.
- Sync runs only while the app is open; no background sync. Offline changes queue and upload on reconnect.
- Encryption of the remote vault: end-to-end (default; AES-256-GCM, scrypt KDF; password unrecoverable) or standard (server-held key). Local vault is never encrypted.
- Running a second sync tool (Dropbox, iCloud, OneDrive) on the same vault is discouraged; "files on demand" placeholders look like deletions.

### What syncs

- Hidden files and folders never sync, except the config folder. File recovery snapshots and Sync's own settings never sync.
- Selective sync toggles file types: images, audio, videos, PDFs, other types. The docs disagree on defaults: the settings page says images, audio, videos and PDFs are on, "Sync all other types" must be turned on; the FAQ says notes, images and config sync by default and PDFs, audio, video, other files are added. Treat as: Markdown, canvases (unverified), bases (unverified), images on; others vary by version.
- Vault configuration sync defaults on: other file types (sic), main settings, appearance, themes and snippets, hotkeys, active core plugin list, core plugin settings. Off: active and installed community plugin lists.
- Excluded folders can be set; already-synced files stay in the remote vault.
- Per-file size limit 5 MB (Standard) or 200 MB (Plus).

### Conflict handling (documented)

A conflict is a change to the same file on two or more devices before they sync.

| File kind | Behaviour |
| --- | --- |
| Markdown (`.md`) | Merged with Google diff-match-patch. Default mode "Automatically merge": all edits kept in one file; may produce duplicated text or formatting glitches that the user fixes by hand. |
| Markdown, mode "Create conflict file" (1.9.7+) | No auto merge. A new file `original-note-name (Conflicted copy <device-name> YYYYMMDDHHMM).md` holds the changes from the device that detected the conflict; the original keeps the remote version. |
| Other files, including `.canvas` | Last modified wins; the newest version replaces earlier ones. |
| Settings JSON in the config folder | JSON merge: local keys applied on top of the remote JSON. |
| New note created on two devices within a couple of minutes (e.g. Daily notes, templates on startup) | Sync keeps the remote version without merging; recover the local one from File recovery. |

- Conflict resolution mode is a per-device setting and must be set on each device.
- Conflicts are visible in the Sync log (filter "Merge Conflicts").

### Version history

- **Sync history** (1.7): sidebar list of recently synced files with last editor (desktop hover). Not in the sidebar by default; add via command "Sync: Show Sync history".
- **Version history** per file: open from the file context menu; list of versions on the left, content on the right, diff, **Restore** replaces current content.
- Retention: notes 1 month (Standard) or 12 months (Plus); attachments 2 weeks; data kept 1 month after subscription expiry. Version history counts toward storage.
- **Deleted files**: Settings → Sync → Deleted files → View; restore to original path; bulk restore.
- **Settings history**: per config file, restore then reload.
- Separate, local-only safety net: File recovery snapshots (5 min interval, 7 days).

### Headless Sync

`obsidian-headless` (Node 22+, open beta) syncs a vault without the app; `--mode bidirectional` (default), `pull-only`, `mirror-remote`.

Sources: `en/Obsidian Sync/Local and remote vaults.md`, `en/Obsidian Sync/Troubleshoot Obsidian Sync.md`, `en/Obsidian Sync/Version history.md`, `en/Obsidian Sync/Sync settings and selective syncing.md`, `en/Obsidian Sync/Frequently asked questions.md`, `en/Obsidian Sync/Security and privacy.md`, `en/Obsidian Sync/Plans and storage limits.md`, `en/Obsidian Sync/Headless Sync.md`, `en/Plugins/File recovery.md`.

## 12. Implications for Quire (summary)

- Store exactly what Obsidian stores: `.md` with YAML frontmatter, attachments as files, config as JSON in a dot-folder. Do not write into `.obsidian/`; use a Quire dot-folder so both apps can share a vault.
- Index model: mirror `CachedMetadata` fields and `resolvedLinks`/`unresolvedLinks`.
- Sync: copy the documented conflict semantics (text merge for `.md`, last-modified-wins otherwise, optional conflict-copy naming pattern) and keep per-file version history on the server.

## Sources

- obsidian-help at `08ef563f07b78dd589f19b1583d089c1e2d2377c`, paths cited per section.
- obsidian-api at `9abd9605ce081383674aae1ed111c456edde0688`: `obsidian.d.ts`, `canvas.d.ts`, `README.md`.
- JSON Canvas spec https://jsoncanvas.org/ (referenced, not fetched).
- Google diff-match-patch https://github.com/google/diff-match-patch (referenced by the Sync docs).
