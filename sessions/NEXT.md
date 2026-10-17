# Next steps

What is left after Quire 0.1.0, split by who can do it. `sessions/GIST.md` says what is
true now; this file says what comes next. Agents update both: tick an item when it ships
and add items as they turn up.

## Human steps (the owner)

These need a person: an account, a device, money, or a decision.

1. **Tag `v0.1.0`.** The agent's git proxy refuses tag pushes.
   - Command line: `git fetch origin && git tag -a v0.1.0 5adae66 -m "Quire 0.1.0" && git push origin v0.1.0`
   - Or create a release in the GitHub UI.
2. **Make the repository private.**
   - Private repositories get a monthly Actions minute allowance. CI costs about 5 minutes
     per push or PR; the weekly `deploy` plus `ux` run costs about 20.
3. **Choose the next features.** The agent list below covers gaps and quality only. Pick
   from the deferred features, and an agent writes the change proposal:
   - templates and a slash menu;
   - note transclusion (`![[note]]` embeds of notes, not files);
   - database views with formulas (Notion and Bases style);
   - Canvas;
   - end-to-end encryption;
   - several vaults per server, or per-vault permissions.
4. **Deploy for real.** You need:
   - a host with Docker, a domain and DNS;
   - `docker compose --profile tls up -d` (`deploy/README.md`);
   - a token per person and device (`quire token create`);
   - backups copied off the host;
   - one restore drill on the real data.
5. **Try Android on a phone.** Get the debug APK from a manual "ci" run (Actions,
   "ci", "Run workflow", then the run's `quire-debug-apk` artifact). Install it with
   `adb install app-debug.apk` or by opening the file on the phone. Use it offline, sync,
   and report what breaks.
6. **Merge agent PRs**, or tell the agent it may merge once CI is green.
7. **Watch the credit.** When the cloud credit runs out, sessions stop. Everything is pushed,
   so a new session resumes from `sessions/GIST.md`.
8. **Optional.** Post the LinkedIn draft (`cloud-files/notes/linkedin-draft.md`).

## Agentic work

Ordered by value for the credit it costs. Do one at a time, as a single agent, with one full
gate run before each push. Status: `[ ]` open, `[x]` shipped (with the commit or PR).

1. [x] **CI `deploy` and `ux` jobs failed on `main`.** Fixed in `211f2f9` and `2ac2f82`;
   manual run 9 on the branch passed all three jobs. Three causes:
   - the deploy job never installed Chromium, which every scenario launches;
   - Compose's bake builder refuses the `/dev/null` default of the `extra_ca` secret;
   - the runner lacked Inter, which the UI font stack resolves to where the UX baseline
     was approved.
2. [x] **Cap live-room edits at `QUIRE_MAX_NOTE_BYTES`** (0003 known gap). Change 0005,
   R-ACC-06 "Oversized live edit".
3. [x] **Change 0006: local nodes replicate attachments and renames** (R-SYN-09 known
   limitation). Three new R-SYN-09 scenarios; the README and deployment guide no longer
   list the limits.
4. [x] **Split the files over the 300-line soft limit** (S8). Four of five done, with no
   behaviour change (scenarios 136/136):
   - `merge`: `segments.ts`, `frontmatter.ts`;
   - `sync`: `memory.ts` (in-memory store, transport and revision store) and
     `push-batches.ts`;
   - `render`: `source-ranges.ts`.

   `apps/web/src/sync/workspace.ts` (417) stays: it is one stateful class, and the pieces
   that could move save about 36 lines. Split it when a change next adds to it.
5. [x] **Android debug APK in CI.** The `android debug APK` job runs on demand: Actions,
   "ci", "Run workflow". It uploads `quire-debug-apk` (kept 14 days). First run: green,
   1.5 minutes of Gradle.
6. [x] **Dependency hygiene.** `pnpm audit` found nothing. `.github/dependabot.yml` sends
   weekly grouped updates for npm (`quire/`) and GitHub Actions. The UX gate's pinned
   engines are left for manual bumps. The uv tooling has no dependencies to track.
7. [x] **Playbook amendment 0010: handoff and gate environments.** Playbook 1.10.0:
   `modules/handoff`, plus rules in hardening, ux and scenarios.
8. [x] **Tell the person why a live edit was refused.** Change 0007, R-LIV-06.
9. [x] **Fonts in the UX gate's engines.** The gate records which platform fonts the UI
   and code stacks resolve to. The re-approved baseline changed only its engines line
   (`ui Inter, mono DejaVu Sans Mono`).
10. [ ] **Node 24 runtime.** Move the image and CI from Node 22 to Node 24 LTS once
   `node:sqlite` behaves the same. Run every gate; record any difference.
