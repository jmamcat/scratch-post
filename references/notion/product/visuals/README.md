# Notion: visuals capture checklist

Notion is closed source and its UI is proprietary. We do **not** commit
screenshots, screen recordings or downloaded images of Notion to this
repository.

## Rules

- Put every capture in `references/notion/product/visuals/captures/`. That
  path is gitignored (`references/*/product/visuals/captures/` in the root
  `.gitignore`). Check `git status` before committing anything near it.
- Capture from your own Notion account, using a scratch workspace with no
  personal or customer data.
- Do not download images from notion.com help pages or release notes; link to
  them instead (the links below).
- File name: `<checklist-id>_<platform>_<YYYY-MM-DD>.png`, for example
  `V03_web_2026-10-16.png`. Platforms: `web`, `desktop`, `android`, `ios`.
- After capturing, add a row to the log at the bottom (date, ID, platform,
  Notion version). Do not paste the image itself anywhere in the repo.

## Checklist

| ID | Screen or state | What to look for | Features | Official reference |
| --- | --- | --- | --- | --- |
| V01 | Slash menu open on an empty line | Grouping, search filtering, keyboard focus, greyed items | NOT-F-029 | https://www.notion.com/help/writing-and-editing-basics |
| V02 | Block `⋮⋮` menu with Turn into submenu | Verb list, hover handle position, drag guides | NOT-F-031 | https://www.notion.com/help/what-is-a-block |
| V03 | Page with sidebar tree expanded | Teamspaces, Shared, Private, Favorites; nesting depth; new page button | NOT-F-035, NOT-F-036 | https://www.notion.com/help/navigate-with-the-sidebar |
| V04 | Page with toggle, callout and two columns | Block chrome on hover, column resize guide | NOT-F-006, NOT-F-008, NOT-F-015 | https://www.notion.com/help/columns-headings-and-dividers |
| V05 | Database table view with property header menu open | Property types menu, `+ property` flow, calculations row | NOT-F-046, NOT-F-051 | https://www.notion.com/help/tables |
| V06 | Board view grouped by Status | Card layout, group headers, hidden groups | NOT-F-052 | https://www.notion.com/help/boards |
| V07 | Calendar view and timeline view of the same database | Date placement, drag to reschedule, timeline bars | NOT-F-053, NOT-F-054 | https://www.notion.com/help/calendars and https://www.notion.com/help/timelines |
| V08 | Filter builder with a nested AND/OR group | Filter group nesting, sort and group controls | NOT-F-059 | https://www.notion.com/help/views-filters-and-sorts |
| V09 | Database row opened as a page | Properties above body, page layout panel | NOT-F-062 | https://www.notion.com/help/layouts |
| V10 | `@` / `[[` link picker and backlinks above the title | Search results, create-new option, backlink count | NOT-F-067, NOT-F-069 | https://www.notion.com/help/create-links-and-backlinks |
| V11 | Synced block with ORIGINAL label and instance list | Border, ORIGINAL label, list of other locations | NOT-F-026 | https://www.notion.com/help/synced-blocks |
| V12 | Inline comment thread, comments pane, and a suggested edit | Anchor highlight, resolve button, accept and reject controls | NOT-F-075, NOT-F-076 | https://www.notion.com/help/comments-mentions-and-reminders, https://www.notion.com/help/suggested-edits, https://www.notion.com/releases/2025-11-14 |
| V13 | Offline states: `•••` menu with "Available offline", Settings > Offline dashboard, slash menu with greyed online-only blocks, and the app while disconnected | Download progress bar, how offline status is shown (no indicator is documented, unverified) | NOT-F-090 to NOT-F-094 | https://www.notion.com/help/use-pages-offline, https://www.notion.com/releases/2025-08-19 |
| V14 | Version history panel and Share menu | Highlighted edits and attribution (3.8), permission levels dropdown, general access | NOT-F-041, NOT-F-077 | https://www.notion.com/help/duplicate-delete-and-restore-content, https://www.notion.com/releases/2026-10-13, https://www.notion.com/help/sharing-and-permissions |
| V15 | Mobile editor with keyboard toolbar (Android) | Toolbar actions, always-visible `+` and `•••`, columns stacked | NOT-F-095, NOT-F-096 | https://www.notion.com/help/notion-for-mobile |

## Capture log

| Date | ID | Platform | Notion version | Captured by |
| --- | --- | --- | --- | --- |
| | | | | |
