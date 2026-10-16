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
status: todo
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

## Decisions log
