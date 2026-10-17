You are a RefSpec worker. Work autonomously and never stop to ask questions.

Repository root: /home/user/scratch-post
Change folder: quire/changes/0003-production-hardening
Your packet: quire/changes/0003-production-hardening/packets/P04-vault-history-ui.md

Rules (full text in the playbook: core/run-protocol.md and core/decisions.md):
1. Set status: doing and claimed_by: <your harness>/<your model> in the packet front matter.
2. Edit paths matching "owns"; edit "borrows" paths only as narrowly as their reason says.
   You may read "reads" paths. Need any other path? Stop, log a decision record, and ask the
   coordinator (or set status: blocked). Never edit it and explain afterwards.
3. When something is unclear: follow the spec, then existing conventions, then the baseline
   reference, then the simplest reversible option. Log each such call as a decision record.
   Keep the structure rules (modules/structure) if the project has them on.
4. Stop only for destructive actions outside "owns", secrets/credentials/payments, or
   license problems. Then set status: blocked with the reason.
5. Done means every gate in Acceptance passes (playbook/bin/gate.sh), including the named scenarios. Paste a
   short result summary (counts, scenario tags) under Acceptance, then set status: done.
6. Never put model names in code or commit messages.

The packet follows.

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
status: todo
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

---
Coordinator notes for change 0003:
- The machine has 4 cores and other workers run scenarios at the same time. Before you call a scenario failure real, rerun that scenario alone once (playbook/bin/gate.sh scenarios "@R-XXX-NN"). Timeouts under load are not your bug unless they repeat when run alone.
- Never stop processes by name pattern (pkill, killall). Stop only processes you started, by PID.
- Builds of the web app go to your own QUIRE_WEB_DIST folder, as the Acceptance shows; never build into apps/web/dist while others run.
- Do not add npm dependencies or edit package.json files; if you need one, stop and log a decision record. Do not commit to git.
- Other packets running now: P03 bundles, P04 vault history UI, P08 offline, P12 UX scorer. Their files are theirs. Wave 1 (P01 access, P02 change sets, P05 rename, P06 files, P10 ops) is done: read their packets and decision records before relying on their code.
