---
id: 0001-mvp-foundation/P09
title: Capacitor Android scaffold
lane: E
depends_on: [P07]
owns:
  - quire/apps/android/**
reads:
  - quire/apps/web/**
size: S
status: done
claimed_by: claude-code/claude
---

# Capacitor Android scaffold

## Context

Implements R-PLT-03 (wrapper part). The agent container has no Android SDK, so this
packet produces config and docs, not an APK.

## Contract

- `apps/android/package.json` with `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
  and scripts `add` (`cap add android`), `sync` (build web then `cap sync android`),
  `open` (`cap open android`).
- `capacitor.config.ts`: appId `app.quire.notes`, appName `Quire`, webDir `../web/dist`,
  `server.androidScheme: 'https'`, cleartext allowed only for LAN development.
- `README.md`: prerequisites (JDK 21, Android Studio/SDK), steps to produce a debug APK,
  how to point the app at a cloud or local node in Settings, offline behaviour.

## Acceptance

```sh
pnpm -C quire --filter @quire/android exec cap --version
```

Result: cap --version: 7.6.9.

## Decisions log

- **D-P09-1** · confidence: med
  - Question: Generate the native android/ project now?
  - Did: No. Config, scripts and README only; `pnpm --filter @quire/android add` generates it on a machine with the SDK.
  - Why: No Android SDK in the agent container; a generated Gradle tree would be unverified bulk.
  - Reverse: Run cap add android and commit apps/android/android/.
