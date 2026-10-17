---
# Machine-readable header. Agents read this block; keep keys stable.
id: obsidian
name: Obsidian
role: baseline
review_cadence: per-change
source: open-format
license: "proprietary (app); no license file, all rights reserved by default (obsidian-help docs); MIT (obsidian-api)"
included_on: 2026-10-16
last_reviewed: 2026-10-16
upstream:
  - path: upstream/obsidian-help
    url: https://github.com/obsidianmd/obsidian-help
    branch: master
    pinned: 08ef563f07b78dd589f19b1583d089c1e2d2377c
  - path: upstream/obsidian-api
    url: https://github.com/obsidianmd/obsidian-api
    branch: master
    pinned: 9abd9605ce081383674aae1ed111c456edde0688
---

# Obsidian

## Why it is in the set

Obsidian is the most widely used local-first Markdown notes app that stores a vault as a plain folder of `.md` files. It answers the question "what should Quire do by default?" for syntax (Obsidian Flavored Markdown), file layout (vault, attachments, config folder), linking (wikilinks, shortest-path resolution, rename updates), structured data (properties, Bases), and sync semantics (merge on conflict, version history). The app is closed source, but its help docs and plugin API type definitions are public and are the study material here.

## How we use it

- **Role:** baseline. When a Quire default, syntax rule, or file-layout choice is undecided, Quire copies the Obsidian behaviour documented in `product/`. Deviations must be stated explicitly in the Quire change proposal with a reason. Files written by Quire must open in Obsidian without loss, and an Obsidian vault opened in Quire must render the OFM subset Quire supports.
- **Review cadence:** per-change. Any Quire change that touches syntax, link handling, file layout, properties, sync or settings defaults re-reads the relevant section of `product/`. Early full review when Obsidian ships a minor version (1.x) that changes OFM, Properties, Bases, or Sync behaviour, or when the pinned upstream docs move more than one minor app version.
- **Borrow:**
  - Vault = plain folder of Markdown files; app config in a dot-folder inside the vault.
  - Obsidian Flavored Markdown as the reference dialect (CommonMark + GFM + wikilinks, embeds, block IDs, callouts, `%%` comments, `==` highlights, math, Mermaid).
  - YAML frontmatter properties with vault-wide types (text, list, number, checkbox, date, datetime, tags).
  - Link defaults: wikilinks on, shortest-path link text, update links on rename, unresolved links create notes on click.
  - Keyboard-first navigation: quick switcher (`Ctrl/Cmd+O`), command palette (`Ctrl/Cmd+P`), fuzzy matching.
  - Live Preview as the default editing mode, with Source mode and Reading view available.
  - Backlinks with linked and unlinked mentions.
  - Sync conflict semantics: three-way-style text merge for Markdown (diff-match-patch), last-modified-wins for other files, optional conflict-copy file; per-file version history.
  - `.base` YAML file format for database-like views over frontmatter (subset).
  - JSON Canvas (`.canvas`) as an open format to read, even if Quire does not edit it.
- **Reject:**
  - Community plugin runtime with unsandboxed code: too large a security and maintenance surface for a lean app.
  - Electron desktop shell: Quire is web + server + Android.
  - Graph view (global force-directed graph): low value relative to cost for a lean app; backlinks cover the need.
  - Canvas editor: out of scope for v1; keep the file format readable only.
  - Publish (hosted site builder): out of scope; the Quire server already serves notes.
  - End-to-end encrypted proprietary sync protocol: Quire syncs to its own server; E2EE is a later decision.
  - Workspaces, Slides, Audio recorder, Web viewer core plugins: not needed for a lean v1.

## Product definition

| File | Contents |
| --- | --- |
| `product/features.md` | Feature inventory, grouped, with IDs (`OBS-F-###`), plus "Defaults Quire inherits" |
| `product/ux-principles.md` | Interaction and design principles, with IDs (`OBS-UX-##`) |
| `product/data-model.md` | Vault layout, config folder, properties, link resolution, OFM syntax table, JSON Canvas, `.base`, Sync conflicts and version history |
| `product/visuals/README.md` | What to capture and where (captures are gitignored) |

## Upstream (open source only)

The app is closed. Two public repos are tracked as submodules for study:

- `upstream/obsidian-help`: source of https://obsidian.md/help (an Obsidian vault per locale). No LICENSE file at the pinned revision, so treat it as all rights reserved: quote sparingly and paraphrase.
- `upstream/obsidian-api`: TypeScript definitions for the plugin API (`obsidian.d.ts`, `canvas.d.ts`, `publish.d.ts`). MIT, copyright Dynalist Inc. `package.json` version at the pinned revision: 1.14.4.

How to fetch and update the copy: `playbook/bin/refs.sh fetch obsidian`, `playbook/bin/refs.sh update obsidian`, `playbook/bin/refs.sh status`. Never edit files under `upstream/`.

### Paths worth reading first

obsidian-help (English is the source of truth, under `en/`):

| Path | Why |
| --- | --- |
| `en/Editing and formatting/Obsidian Flavored Markdown.md` | Official list of OFM extensions over CommonMark/GFM |
| `en/Editing and formatting/Basic formatting syntax.md` | Line breaks, highlights (with color emoji), task lists, comments, footnotes, escaping |
| `en/Editing and formatting/Advanced formatting syntax.md` | Tables, Mermaid, math (MathJax) |
| `en/Editing and formatting/Callouts.md` | Callout syntax, fold markers, full type and alias list |
| `en/Editing and formatting/Properties.md` | Frontmatter property types, default properties, display modes |
| `en/Editing and formatting/Tags.md` | Tag character rules, nesting, case-insensitivity |
| `en/Linking notes and files/Internal links.md` | Wikilink and Markdown link forms, headings, block IDs, display text |
| `en/Linking notes and files/Embed files.md` | Embed syntax, image sizing, PDF page/height params |
| `en/User interface/Settings.md` | Every settings page and option |
| `en/Files and folders/How Obsidian stores data.md` | Vault, `.obsidian`, global settings, metadata cache |
| `en/Bases/Bases syntax.md` | `.base` file schema, filters, formulas, properties, operators, types |
| `en/Bases/Functions.md` | Function library for Bases formulas and filters |
| `en/Plugins/Canvas.md` | Canvas behaviour; format is JSON Canvas |
| `en/Obsidian Sync/Troubleshoot Obsidian Sync.md` | Conflict resolution rules and conflict file naming |
| `en/Obsidian Sync/Version history.md` | Sync history and version retention |
| `en/Obsidian Sync/Sync settings and selective syncing.md` | Selective sync defaults, hidden files, config sync |
| `en/Plugins/Core plugins.md` | Core plugin list |
| `en/Plugins/Search.md` | Search operators and property search syntax |
| `en/Getting started/Mobile app.md`, `en/Obsidian/Obsidian for Android.md` | Mobile toolbar, quick action, Android storage |

obsidian-api:

| Path | Why |
| --- | --- |
| `obsidian.d.ts`, `CachedMetadata` | What the metadata index extracts per note (links, embeds, tags, headings, blocks, sections, list items, footnotes, frontmatter) |
| `obsidian.d.ts`, `MetadataCache.getFirstLinkpathDest` / `fileToLinktext` | Link resolution and shortest-path link generation |
| `obsidian.d.ts`, `FileManager` | Rename with link update, frontmatter edit, attachment path, trash |
| `obsidian.d.ts`, `ListItemCache.task` | Task status character semantics |
| `obsidian.d.ts`, `SectionCache.type` | Block-level section types |
| `canvas.d.ts` | JSON Canvas node and edge types |
| `README.md` | Plugin manifest fields and app module architecture |
| `CHANGELOG.md` | API changes per app version |

## Review log

| Date | Reviewer | Upstream rev | Notes |
| --- | --- | --- | --- |
| 2026-10-16 | Claude (agent) | obsidian-help 08ef563f, obsidian-api 9abd9605 | Initial inclusion |
