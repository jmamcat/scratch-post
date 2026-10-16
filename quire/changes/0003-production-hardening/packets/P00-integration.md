---
id: 0003-production-hardening/P00
title: Specs, vocabulary, schema version 2 and extension points (integration packet)
lane: Z
depends_on: []
owns:
  - quire/changes/0003-production-hardening/**
  - quire/spec/STEPS.md
  - quire/apps/server/src/app.ts
  - quire/apps/server/src/main.ts
  - quire/apps/server/src/cli.ts
  - quire/apps/server/src/platforms/config.ts
  - quire/apps/server/src/vault/schema.ts
  - quire/apps/server/src/*/README.md
  - quire/apps/web/src/App.tsx
  - quire/apps/web/src/main.tsx
  - quire/scenarios/support/**
  - quire/scenarios/steps/servers.steps.ts
  - quire/scenarios/package.json
  - quire/package.json
  - quire/ARCHITECTURE.md
  - playbook.yaml
borrows:
  - quire/apps/server/src/vault/store.ts  # migrations, commit extras, rename-aware history
  - quire/apps/server/src/live/rooms.ts  # authorize hook, closeConnections, stats
  - quire/packages/sync/src/protocol.ts  # DocMeta kind/blob/size/renamedFrom, CommitExtra, ChangeSet, renamedFrom, movedTo, file conflicts
  - quire/packages/sync/src/client.ts  # FileSink hook
  - quire/packages/sync/src/server.ts  # commit extras in the store interface
  - quire/packages/sync/src/http.ts  # streamParams, streamUrl, authHeaders, request
  - quire/apps/web/src/sync/server-events.ts  # per-connection URL
  - quire/apps/web/src/sync/workspace.ts  # event stream URL function
  - quire/apps/web/src/live/live.ts  # credentials per join
  - quire/apps/web/src/vault/Editor.tsx  # extensions prop
  - quire/apps/web/src/render/Reader.tsx  # imageSrc prop
  - quire/scenarios/steps/live.steps.ts  # event stream URL
  - quire/scenarios/playwright.config.ts  # @deploy only through scenarios:deploy
reads:
  - quire/**
size: M
revision: 1
status: done
claimed_by: claude-code/tier-A (coordinator)
---

# Integration packet

Spec deltas, step vocabulary, schema version 2, and a stub with a fixed contract for every
worker packet, wired into the server and the app, so P01 to P13 each own separate paths.

## Acceptance

```sh
playbook/bin/gate.sh check
playbook/bin/gate.sh scenarios
```

Result: check ok (0 violations, 5 soft size warnings from 0001). Scenarios: 131 generated
from 90 requirements; 89 pass (every scenario from 0001 and 0002, plus R-ACC-01 "Missing
token", which moved from R-PLT-04); 41 new scenarios fail until their packets land.

## Decisions log

- **D-P00-1** · confidence: med
  - Question: Scenario servers have no token; R-ACC-01 makes the server refuse to start without one.
  - Did: `support/servers.ts` sets `QUIRE_INSECURE_NO_AUTH=1` unless the scenario sets `QUIRE_TOKEN` (or `QUIRE_SECURE` for the refusal scenario), and a 1 second change-set gap.
  - Why: every older scenario stays valid unchanged; access scenarios exercise the secure path.
  - Reverse: default to a generated token in `World.startCloud` and give every device that token.
- **D-P00-2** · confidence: med
  - Question: Where do attachments live in the sync protocol?
  - Did: In the same revision log (`kind = 'file'`, `blob`, `size`), with bytes in a content store; pulls hand file heads to a `FileSink` instead of the note store.
  - Why: history, change sets, restore and backups then cover files with no second log.
  - Reverse: a separate `files` table and feed.
- **D-P00-3** · confidence: med
  - Question: One schema version per packet, or one for the change?
  - Did: Schema version 2 holds every table and column 0003 needs, written up front.
  - Why: several packets would otherwise edit the migration list at once.
  - Reverse: split version 2 into several versions before release.
