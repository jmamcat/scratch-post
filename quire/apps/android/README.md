# Quire for Android

A Capacitor wrapper around the web client (`../web`). The app stores the whole vault in
the WebView's IndexedDB, so notes open, change and get created with no connection; it
syncs with a cloud server or a local node when one is reachable.

## Prerequisites

- JDK 21 and Android Studio (or the Android SDK command-line tools) with platform 35.
- `ANDROID_HOME` set, `adb` on the PATH for installing on a device.

The native `android/` project is not committed; the first command below generates it (CI
does the same on every build).

## Get a debug APK from CI

Run the "ci" workflow by hand (GitHub, Actions, "ci", "Run workflow"). Its
`android debug APK` job builds the app and attaches `quire-debug-apk` to the run, kept
for 14 days. The APK is unsigned for release; install it with `adb install app-debug.apk`
or by opening it on the phone (allow installs from that source).

## Build a debug APK

```sh
cd quire
pnpm install
pnpm --filter @quire/android add        # once: generates apps/android/android/
pnpm --filter @quire/android sync       # builds the web client and copies it in
cd apps/android/android && ./gradlew assembleDebug
# APK: apps/android/android/app/build/outputs/apk/debug/app-debug.apk
```

`pnpm --filter @quire/android open` opens the project in Android Studio instead.

## Point the app at a server

Open Settings in the app (command palette, "Open settings") and set:

- **Server URL**: `https://quire.example.com` for a cloud server, or
  `http://192.168.1.20:8787` for a local node on your LAN. Plain `http://` only works
  when the app was built with `QUIRE_ANDROID_CLEARTEXT=1`.
- **Token**: the server's `QUIRE_TOKEN`, if it has one.
- **Device name**: shown on other devices when your edits collide with theirs.

## Offline behaviour

- Every note is stored on the phone. Edits made offline are marked pending and pushed
  when the server is reachable again.
- If another device changed the same note meanwhile, the server merges both versions.
  Anything it cannot merge safely appears in the Review inbox on every device.
