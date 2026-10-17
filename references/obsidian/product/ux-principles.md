# Obsidian: UX principles

Principles inferred from Obsidian's documented behaviour and stated positioning. Each has evidence (where the docs show it) and a takeaway for Quire. IDs `OBS-UX-##` are stable; append only.

| ID | Principle | Evidence in Obsidian | Takeaway for Quire |
| --- | --- | --- | --- |
| OBS-UX-01 | Local-first | Notes live on the device, not in the cloud; the app works fully offline; sync is an optional add-on and offline edits queue until reconnect. | The Android app and web client must read and write a local copy and work with no server. The server is a sync peer and backup, never the only copy. |
| OBS-UX-02 | Files you own | A vault is a normal folder; notes are `.md` files editable in any editor; external changes are picked up automatically; renaming a vault renames the folder. | Quire storage is a folder of Markdown files with no database as source of truth. Any index (search, links) is a rebuildable cache. Watch the folder for external edits. |
| OBS-UX-03 | Plain text, future-proof | "Maximum capability without breaking any existing formats": CommonMark + GFM base; Obsidian-only syntax degrades to readable text; HTML comment fallback suggested for portability; Markdown link format offered for interoperability; JSON Canvas published as an open format. | Every Quire extension must stay readable as raw text and must not corrupt files for other Markdown tools. Prefer syntax that already exists in OFM over inventing new syntax. |
| OBS-UX-04 | Links are first-class | `[[` autocompletes from anywhere; links to missing notes are allowed and create the note on click; backlinks and unlinked mentions; rename rewrites links; heading and block targets. | Linking must be as cheap as typing `[[`. Ship backlinks (linked and unlinked) and rename-safe links in v1. Never block saving because a link target does not exist. |
| OBS-UX-05 | Progressive disclosure via plugins | Core features are toggleable core plugins; several start off (e.g. Slides, Workspaces, Random note); community plugins start disabled under Restricted mode. | Keep the default surface small. Gate optional features behind settings toggles that start off, rather than adding UI for everyone. No third-party code by default. |
| OBS-UX-06 | Keyboard-first | Command palette `Ctrl/Cmd+P` lists every command with its hotkey; quick switcher `Ctrl/Cmd+O`; fuzzy matching ("scf" finds Save current file); all commands rebindable; slash commands optional. | Every action is a named command reachable from a palette. A quick switcher that opens or creates notes by fuzzy name is a v1 feature. Hotkeys are user-configurable and stored with the vault. |
| OBS-UX-07 | Create by navigating | Quick switcher: Enter on a non-matching name creates the note; Shift+Enter forces creation; clicking an unresolved link creates it. | Note creation should never require a dialog beyond typing the name. The same input finds and creates. |
| OBS-UX-08 | Live Preview by default | New tabs open in editing view with Live Preview: formatting renders inline and syntax appears only at the cursor. Source mode and Reading view stay one toggle away (`Ctrl/Cmd+E`). | Default editor is a live-preview Markdown editor (CodeMirror 6 class), with a raw source toggle and a read-only rendered view. The file on disk is always the plain Markdown. |
| OBS-UX-09 | Structure without schema | Properties are optional YAML; types are inferred and then fixed per name vault-wide; Bases filter over all files with no declared tables; tags can be nested. | Metadata is opt-in frontmatter. Type a property once per vault, not per note. Views (Bases-like) query files; they never own the data. |
| OBS-UX-10 | Safe by default | File recovery snapshots every 5 minutes for 7 days; deletions go to system trash and ask for confirmation; Sync merges Markdown conflicts instead of overwriting; version history; Publish deletions must be ticked manually; HTML is sanitized. | Destructive operations are reversible: trash, local snapshots, per-file version history on the server. Sync conflicts on Markdown merge text and never silently drop an edit. |
| OBS-UX-11 | Same model on every device | Mobile uses the same vault, syntax and commands; mobile adds a configurable toolbar, pull-down Quick Action (default: command palette) and a navigation bar instead of ribbon and sidebars. | The Android app shares the data model and command set with web. Mobile-specific UI is limited to an editing toolbar above the keyboard and a navigation bar; the command palette is one gesture away. |
| OBS-UX-12 | Opinionated defaults, everything adjustable | Defaults are documented (wikilinks on, attachments in vault root, Live Preview, adapt-to-system theme), yet nearly every behaviour has a setting, and settings are plain JSON in `.obsidian/`. | Choose Obsidian's defaults so migrating users feel at home. Store Quire settings as plain JSON inside the vault (dot-folder) so they sync and diff like notes. |
| OBS-UX-13 | One index powers many views | A single metadata cache (links, headings, tags, blocks, frontmatter) feeds graph, outline, backlinks, search, Bases and the quick switcher; it can be rebuilt from files. | Build one incremental index per vault on the server and on Android; derive outline, backlinks, tags and search from it. Provide a "rebuild index" action. |
| OBS-UX-14 | Transclusion over duplication | `![[note#heading]]` and `![[note#^block]]` embed live content; embeds stay current when the source changes. | Support embeds of notes, headings and blocks so users reuse text instead of copying it. Render embeds read-only inside the host note. |

## Sources

- `upstream/obsidian-help/en/Getting started/Back up your Obsidian files.md` (local storage by default)
- `upstream/obsidian-help/en/Files and folders/How Obsidian stores data.md`
- `upstream/obsidian-help/en/Editing and formatting/Obsidian Flavored Markdown.md`
- `upstream/obsidian-help/en/Editing and formatting/Basic formatting syntax.md` (comments portability note)
- `upstream/obsidian-help/en/Editing and formatting/Views and editing mode.md`
- `upstream/obsidian-help/en/Editing and formatting/Properties.md`
- `upstream/obsidian-help/en/Linking notes and files/Internal links.md`, `Embed files.md`
- `upstream/obsidian-help/en/Plugins/Core plugins.md`, `Command palette.md`, `Quick switcher.md`, `Backlinks.md`, `File recovery.md`
- `upstream/obsidian-help/en/Extending Obsidian/Plugin security.md`
- `upstream/obsidian-help/en/Obsidian Sync/Troubleshoot Obsidian Sync.md`, `Local and remote vaults.md`
- `upstream/obsidian-help/en/Getting started/Mobile app.md`
- `upstream/obsidian-help/en/Bases/Bases syntax.md`
- `upstream/obsidian-api/obsidian.d.ts` (`MetadataCache`, `CachedMetadata`)
