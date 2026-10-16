---
id: 0003-production-hardening/P04
title: Vault history in the app
lane: F
depends_on: [P02]
owns:
  - quire/apps/web/src/backup/**
  - quire/scenarios/steps/backup-ui.steps.ts
borrows: []
reads:
  - quire/changes/0003-production-hardening/**
  - quire/spec/**
  - quire/apps/web/src/**
  - quire/apps/server/src/backup/**
  - quire/packages/sync/src/**
  - quire/scenarios/**
size: S
revision: 1
status: doing
claimed_by: claude-code/tier-B
---

# Vault history in the app

## Context

Implements R-BAK-07 (`quire/changes/0003-production-hardening/spec/backup/spec.md`). The
command "Open vault history" already opens `VaultHistory` from `apps/web/src/backup/`
(a stub). The API is P02's: `GET /api/changesets?limit=` gives `ChangeSet[]` newest first;
`POST /api/changesets/:id/restore` with `{ device }` restores. Call them with
`ws.transport.request(method, path, body)`.

## Contract

```ts
export function VaultHistory(props: { ws: Workspace; onClose: () => void }): JSX.Element;
```

- A drawer (reuse `shared/Drawer.tsx`) titled "Vault history" with a list
  (`aria-label="Vault history"`) of change sets, each an element with `data-changeset="<id>"`
  showing the time span (relative for today, else date and time), the device and the changed
  notes by title (first five, then "and N more"), and a button "Restore vault to here".
- Restore asks for confirmation (`shared/Modal.tsx` `ConfirmDialog`, text naming the time and
  "Every note returns to how it was then. You can undo this from the vault history."), then
  posts, then `ws.syncNow()` and reloads the list.
- Offline or when the server refuses: show "Vault history needs the server." and no list.
- Styles in `backup/vault-history.css` using the theme variables.
- Steps (`quire/scenarios/steps/backup-ui.steps.ts`): `the vault history on "d" lists N
  change sets` (count `[data-changeset]` items, waiting up to 10 s) and `"d" restores the
  vault to change set N in the app` (the Nth item, newest first, then confirm).

## Acceptance

```sh
export QUIRE_WEB_DIST=/tmp/quire-web-P04
pnpm -C quire --filter @quire/web exec vite build --outDir "$QUIRE_WEB_DIST" --emptyOutDir
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios "@R-BAK-07|@R-BAK-02|@R-BAK-03"
```

## Decisions log
