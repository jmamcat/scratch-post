# Learnings

What the cloud sessions of 2026-10-16 to 17 (Quire 0.1.0 and changes 0005 to 0008) learned.
Each item says what went wrong or cost time, and what to do instead. Run reports hold the
detail per change; this file is the short list to read before starting.

## Working on a budget

- **One full gate run per change.** While iterating, run `check` and the affected scenarios
  (`pnpm -C quire/scenarios exec playwright test -g "<name>"`). Run the full `scenarios` gate
  once before pushing. Run `deploy` and `ux` only when the change touches them; CI runs both
  weekly.
- **Run the UX gate in the background.** It takes about 10 minutes. Start it with its output
  in a log file, and wait on the log's last line (`R-PLT-08 gate:`) instead of polling.
- **Single agent over waves.** Parallel worker packets (0002, 0003) were fast, but merging
  and verifying them cost the coordinator more than the work saved on small changes.
- **Keep the handoff current.** Update `sessions/GIST.md` at the end of every turn that
  changes state, so a session that stops when the credit runs out loses nothing.

## Scenarios and the playbook

- **Write the scenarios first and watch them fail.** In 0008, four of six new scenarios failed
  before the code. The two guards (menu stays shut) passed beforehand, which is right for a
  guard. Say so in the run report instead of forcing a failure.
- **Regenerate after adding a steps file.** `bddgen` builds the fixture list from the step
  files that exist when it runs. A new steps file without `pnpm -C quire/scenarios generate`
  gives `world` undefined at run time. The script lives in `quire/scenarios`, not the root.
- **Rebuild the web app when running Playwright directly.** The gate rebuilds when sources
  are newer than `dist` (`build:web:if-needed`); a direct `playwright test` does not. Run
  `pnpm -C quire --filter @quire/web build` first.
- **Stage new change folders before archiving.** `archive-change.py` moves files with git;
  untracked folders failed until `git add` ran first (playbook 1.9.1 does this itself).
- **Bump `playbook/VERSION` with every amendment.** It was missed once.

## Front end

- **Guard the first-load budget with lazy imports.** R-PLT-07 is 320 kB gzip. One static
  import from `App.tsx` of helpers that touch the editor pulled CodeMirror into the first load
  (391 kB). Load such helpers with `import()` on first use (`loadTemplateActions`).
- **CodeMirror completion has timing.** The menu opens about 100 ms after typing and ignores
  Enter for 75 ms after that (`interactionDelay`). A scenario waits for the option to show,
  then past the delay, as a person would. A key pressed sooner inserts a newline.
- **Measure fonts after layout.** The CDP font probe (`CSS.getPlatformFontsForNode`) returns
  nothing until the page has laid out. Force layout and wait one animation frame first.

## CI

- **Every job that runs a scenario needs Chromium**, the deploy job included
  (`playwright install --with-deps chromium`).
- **Compose's bake builder refuses `/dev/null` as a secret file.** The `extra_ca` secret
  defaults to the empty `deploy/no-extra-ca.pem`.
- **The UX baseline depends on fonts.** It was approved with Inter installed. Without it the
  UI falls back to Liberation Sans and every line-length score moves. The ux job installs
  `fonts-inter`, and the gate's engines line records the fonts so a mismatch is visible.
- **Manual runs verify the slow jobs before a merge.** Start the "ci" workflow on the branch
  with the GitHub tools; `deploy`, `ux` and the Android APK only run on schedule or demand.

## Cloud container

- **Start `dockerd` yourself** after any container restart.
- **Use the image mirror.** Docker Hub rate limits; set
  `QUIRE_NODE_IMAGE=mirror.gcr.io/library/node:24-bookworm-slim`.
- **The proxy inspects TLS.** `docker build` needs the `extra_ca` build secret
  (`deploy/README.md`). Never disable verification.
- **Tag pushes are refused** as a policy denial (HTTP 403). Retrying does not help; the
  owner tags releases.
- **The permission classifier blocks broad actions** such as scanning home folders or copying
  scratchpad files into the repository. Ask the owner, then do it.
- **The stop hook wants a clean tree.** Commit and push before ending a turn.
- **The repository is public until the owner changes it.** No secrets, hostnames or proxy
  addresses in commits.
