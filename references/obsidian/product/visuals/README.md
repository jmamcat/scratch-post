# Obsidian: visuals capture checklist

Obsidian is closed source, so screenshots of the app are study material only. Store captures in `references/obsidian/product/visuals/captures/`. That folder is gitignored (`references/*/product/visuals/captures/` in the repo `.gitignore`): never commit captures and never copy images from the help site into the repo.

## How to capture

- Use a fresh sandbox vault (help page "Sandbox vault") or a new empty vault, default theme, default settings, so captures show defaults.
- Desktop: window about 1440x900, light and dark (Appearance: Base color scheme). Mobile: an Android phone, portrait.
- Name files `OBS-V-##-<slug>-<light|dark|android>.png`, for example `OBS-V-01-live-preview-light.png`.
- Record the app version (Settings → General) in `captures/VERSIONS.txt`.
- Help page URLs are `https://obsidian.md/help/<permalink>`; the permalink is in each page's frontmatter in `upstream/obsidian-help/en/`.

## Checklist

| ID | Screen | What to show | Feature IDs | Help page |
| --- | --- | --- | --- | --- |
| OBS-V-01 | Live Preview | A note with headings, a wikilink, a callout, a task list, a highlight; cursor inside a bold span so its syntax is revealed | OBS-F-001, 012, 014, 016 | https://obsidian.md/help/edit-and-read |
| OBS-V-02 | Source mode vs Reading view | Same note side by side (Ctrl/Cmd-click the view switcher), showing `%%comment%%` visible in source and hidden in reading | OBS-F-002, 003, 013 | https://obsidian.md/help/edit-and-read |
| OBS-V-03 | Command palette | Open with `Ctrl/Cmd+P`, fuzzy query (e.g. "scf"), hotkeys on the right, recent and pinned commands | OBS-F-065 | https://obsidian.md/help/plugins/command-palette |
| OBS-V-04 | Quick switcher | Open with `Ctrl/Cmd+O`: empty state (recent notes), a query matching an alias, and a non-matching query offering create | OBS-F-077, 048 | https://obsidian.md/help/plugins/quick-switcher |
| OBS-V-05 | Link autocomplete | Typing `[[`, then `[[Note#`, then `[[Note#^` suggestion lists | OBS-F-004, 006, 007 | https://obsidian.md/help/links |
| OBS-V-06 | Backlinks pane | Right sidebar with Linked mentions and Unlinked mentions expanded, plus "Backlinks in document" at note bottom | OBS-F-061 | https://obsidian.md/help/plugins/backlinks |
| OBS-V-07 | Graph view | Global graph with settings panel open; then local graph of one note with depth slider | OBS-F-140, 141, 142 | https://obsidian.md/help/plugins/graph |
| OBS-V-08 | Properties editor | Note with text, list, number, checkbox, date, tags properties; type picker menu open | OBS-F-100, 101, 105 | https://obsidian.md/help/properties |
| OBS-V-09 | All properties view | Properties view sidebar listing properties with types and counts | OBS-F-075 | https://obsidian.md/help/plugins/properties |
| OBS-V-10 | Bases table | A base in table layout with toolbar (views, results, sort, group, filter, properties), a group-by and a summary row | OBS-F-110, 111, 114, 115 | https://obsidian.md/help/bases/views/table |
| OBS-V-11 | Bases filter editor | Filter menu with a nested and/or group, then the advanced (code) filter editor | OBS-F-112 | https://obsidian.md/help/bases/views |
| OBS-V-12 | Canvas | A canvas with text, file, link and group cards and labelled connections | OBS-F-120, 121, 122 | https://obsidian.md/help/plugins/canvas |
| OBS-V-13 | Search pane | Query using an operator and a property filter, results with context, sort dropdown | OBS-F-130, 132, 109 | https://obsidian.md/help/plugins/search |
| OBS-V-14 | Sync version history | Version history modal for one note: version list left, content and Restore right; plus Sync history sidebar | OBS-F-156, 157 | https://obsidian.md/help/sync/version-history |
| OBS-V-15 | Sync settings | Settings → Sync: conflict resolution option, selective sync toggles, vault configuration sync | OBS-F-155, 160, 161 | https://obsidian.md/help/sync/settings |
| OBS-V-16 | File recovery | Snapshot list with "Show changes" diff | OBS-F-068 | https://obsidian.md/help/plugins/file-recovery |
| OBS-V-17 | Settings: Files and links | Default values for new note location, attachment location, link format, wikilinks, auto-update links | Defaults table | https://obsidian.md/help/settings |
| OBS-V-18 | Settings: Editor | Default values for view, editing mode, readable line length, strict line breaks, properties in document | Defaults table | https://obsidian.md/help/settings |
| OBS-V-19 | Mobile toolbar (Android) | Editing a note with keyboard up and the toolbar row above it; then toolbar configuration screen | OBS-F-181 | https://obsidian.md/help/mobile |
| OBS-V-20 | Mobile navigation (Android) | Navigation bar (back, forward, new/find, tabs, menu) and pull-down Quick Action | OBS-F-182, 183 | https://obsidian.md/help/mobile |
| OBS-V-21 | Android first launch | Vault location choice: device storage vs app storage | OBS-F-184 | https://obsidian.md/help/android |

Minimum set for a first pass: OBS-V-01, 03, 04, 06, 08, 10, 14, 17, 18, 19 (ten screens). The rest are optional.

## Sources

- `upstream/obsidian-help/en/` pages linked above (permalinks from page frontmatter at `08ef563f`).
- Repo `.gitignore` rule for `references/*/product/visuals/captures/`.
