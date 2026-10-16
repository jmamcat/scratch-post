---
id: 0002-workspace-ux/P00
title: Specs, vocabulary and extension points (integration packet)
lane: Z
depends_on: []
owns:
  - quire/changes/0002-workspace-ux/**
  - quire/spec/STEPS.md
  - quire/apps/web/src/App.tsx
  - quire/apps/web/src/Sidebar.tsx
  - quire/apps/web/src/main.tsx
  - quire/apps/web/package.json
  - quire/packages/views/package.json
  - quire/scenarios/steps/sidebar.steps.ts
  - quire/scenarios/support/**
borrows:
  - quire/apps/web/src/vault/Editor.tsx  # mode slot for Live Preview
  - quire/apps/web/src/navigate/RightPane.tsx  # graph tab, properties slot
  - quire/apps/web/src/render/Reader.tsx  # clickable task checkboxes
  - quire/apps/web/src/shared/router.ts  # graph route
  - quire/apps/web/src/platforms/SettingsDialog.tsx  # theme picker
  - quire/packages/sync/src/http.ts  # docs() for head metadata
  - quire/packages/render/src/tasks.ts  # toggleTask
reads:
  - quire/**
size: M
revision: 1
status: done
claimed_by: claude-code/claude (coordinator)
---

# Integration packet

Coordinator packet: spec deltas, step vocabulary, and stubs with fixed props for every
worker packet, wired into the app, so P01 to P07 each own separate files.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios
```

Result: check ok (10 packages typecheck, 0 dependency violations, 0 structure violations);
the 66 scenarios from 0001 pass with the new wiring; the 22 new scenarios fail until their
packets land (undefined steps fail at run time).

## Decisions log

- **D-P00-1** · confidence: med
  - Question: How can seven packets touch one app without editing the same files?
  - Did: The coordinator wrote stubs with fixed props for every new component and wired
    them into App, Sidebar, RightPane, Editor and Reader first; packets own only their own
    folders, plus at most one borrowed file each.
  - Why: amendment 0003; App.tsx would otherwise be edited by four packets at once.
  - Reverse: fold the stubs back into App.tsx.
- **D-P00-2** · confidence: med
  - Question: Sidebar views: tabs or a select?
  - Did: A labelled select ("Sidebar view") with eight entries, plus a command per view.
  - Why: eight icons do not fit the 260 px sidebar; a select is keyboard and screen-reader
    friendly; Obsidian puts extra views behind commands too.
  - Reverse: `apps/web/src/Sidebar.tsx`.
