# Reference set

Products Quire learns from. Each folder follows `playbook/modules/references/REFERENCE.template.md`; roles and
cadences are defined in `playbook/modules/references/roles.md`. Decisions about what Quire takes from
them live in [`feature-matrix.md`](feature-matrix.md).

| ID | Product | Role | Domain | Cadence | Source | License | Upstream copy | Included | Last review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [obsidian](obsidian/REFERENCE.md) | Obsidian | baseline | everything: defaults, syntax, layout | per-change | open format, closed app | proprietary app; docs unlicensed; API MIT | `upstream/obsidian-help`, `upstream/obsidian-api` | 2026-10-16 | 2026-10-16 |
| [notion](notion/REFERENCE.md) | Notion | primary | blocks and widgets, databases | monthly | closed | proprietary | none | 2026-10-16 | 2026-10-16 |
| [confluence](confluence/REFERENCE.md) | Confluence Cloud | secondary | team docs: page tree, history, comments, templates | quarterly | closed | proprietary | none | 2026-10-16 | 2026-10-16 |
| [joplin](joplin/REFERENCE.md) | Joplin | primary | offline, sync, mobile | per-change (sync), quarterly otherwise | open | AGPL-3.0-or-later (study only) | `upstream/joplin` | 2026-10-16 | 2026-10-16 |
| [silverbullet](silverbullet/REFERENCE.md) | SilverBullet | tracking | markdown as database, offline PWA | quarterly | open | MIT | `upstream/silverbullet` | 2026-10-16 | 2026-10-16 |

## Working with upstream copies

```sh
playbook/bin/refs.sh list            # roles and cadences
playbook/bin/refs.sh fetch joplin    # shallow clone of the pinned commit
playbook/bin/refs.sh status          # pinned vs upstream head
playbook/bin/refs.sh update joplin   # move the pin; then update REFERENCE.md and commit
```

Upstream folders are read-only. Visual captures go in each `product/visuals/captures/`,
which is gitignored.

## Why Joplin is the fourth reference

It is the most popular stable open-source Markdown notes app with offline-first clients on
every platform including Android, pluggable sync targets, note history and a documented
conflict model, which makes it the right primary reference for Quire's three-platform sync.
Logseq (outliner, not files-first) and Outline (not Markdown storage) were considered and
not included. SilverBullet was added as tracking-only for its IndexedDB offline client and
in-file conflict widget.
