---
id: 0002-workspace-ux
play: add-feature
status: done
created: 2026-10-16
references: [obsidian, notion, confluence, joplin, silverbullet]
capabilities: [views, render, navigate, vault, platforms]
---

# Workspace UX: one-mode editing, graph, views, themes

## Why

Quire 0001 stores and syncs notes well but feels like a source editor with a preview
toggle. People coming from Obsidian expect Live Preview, a graph, recent files, editable
properties and themes; people coming from Notion and Confluence expect checkboxes that
check and pages grouped by what they are about, not only where they sit in folders.

## Headline scenarios

- Edit and read in one mode: headings and bold render as you type; the markup reappears
  only on the line you are editing (R-RND-08).
- Click a task checkbox and the note's Markdown changes to `[x]` (R-RND-09).
- Switch the sidebar from folders to domains and see finance notes, daily notes and game
  dev notes grouped, whatever folder they are in (R-VIEW-02).
- Open the graph and see how notes link (R-NAV-08).
- Pick one of five themes; heading levels look distinct (R-PLT-05).

## What changes

- **views** (new capability): a sidebar view switcher with Folders, Search, Recent,
  Changes, Domains, Tags, Timeline and Board (group by a property).
- **render**: Live Preview editing mode (the default, as in Obsidian), interactive task
  checkboxes in both modes.
- **navigate**: global and local graph; search operators (`path:`, `tag:`, quotes, `-`);
  recently opened notes.
- **vault**: editable properties (front matter) with types; a vault-wide changes view.
- **platforms**: five themes with distinct heading styles, light and dark each.

## Reference grounding

See `references/feature-matrix.md` rows marked `0002`: OBS-F-001 (Live Preview), OBS-F-070
(graph), OBS-F-083 (tags view), OBS-F-075 and OBS-F-100 (properties), OBS-F-217 (themes),
OBS-F-131 and OBS-F-132 (search operators), NOT-F-052 and OBS-F-111 (board), NOT-F-005
(to-dos), CNF-F-044 (structured trees).

## Out of scope

Database views with formulas, Canvas, community plugins, custom CSS snippets, editing
domain rules in the UI (domains come from properties, tags and folders), graph filters
beyond depth.

## Impact

New package `@quire/views`; new web capability folder `views/`; additions in web `vault/`,
`render/`, `navigate/`, `platforms/`; `@quire/navigate` search gains operators.
