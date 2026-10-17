# Cloud environment

The machine and settings the Quire 0.1.0 sessions ran on (2026-10-16 to 17). These facts
were recorded on 2026-10-17 from inside the container. Hostnames, proxy addresses and
credentials are left out on purpose.

## Platform

| Item | Value |
| --- | --- |
| Product | Claude Code on the web (claude.ai), a cloud session followed from the Claude app |
| Billing | Free cloud credit, $250, nearly spent by 2026-10-17 (see `usage/ledger.csv`) |
| Lifetime | Ephemeral container. The repo is cloned fresh at start; anything not pushed is lost when the container is reclaimed. A restart keeps the disk but stops background processes, the Docker daemon included |
| Permission mode | Auto: a classifier approves or blocks each tool call. It blocked a scan of home folders and a copy of scratchpad files into the public repo until the owner approved it |
| Time zone | UTC |

## Resources

| Item | Value |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS, Linux 6.18 x86_64 |
| CPU | 4 vCPU |
| Memory | 15 GiB |
| Disk | Fixed per-session allowance: 13 GB used and 27 GB available when recorded. `df` shows the host volume size, so read "Avail" |

## Tools

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22.22.0 | Quire's runtime (`node:sqlite`) |
| pnpm | 10.28.0 | |
| uv | 0.11.32 | Runs the playbook's Python scripts |
| Python | 3.13.16 | |
| Docker | 29.8.2, Compose 5.6.0 | Installed, daemon not running at start: run `dockerd` in the background |
| Chromium | 141.0.7390.37 | Preinstalled for Playwright under `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`). Do not run `playwright install` |
| git | 2.43.0 | |

## Network

- **Egress proxy.** All outbound HTTPS goes through an agent proxy that inspects TLS with its
  own certificate authority:
  - tools outside the container's CA bundle fail with `SELF_SIGNED_CERT_IN_CHAIN`;
  - `docker build` gets the authority as the optional `extra_ca` BuildKit secret
    (`deploy/README.md`).
- **Docker Hub rate limits.** Base images come from `mirror.gcr.io/library/...` through
  `QUIRE_NODE_IMAGE`.
- **Package registries.** npm and PyPI work through the proxy.

## GitHub

- **Scope.** The session can reach only `jmamcat/scratch-post`.
- **git over the proxy.** Clone, fetch and branch pushes work. Tag pushes are refused (HTTP
  403), so the owner tags releases.
- **No `gh` CLI or direct API.** PRs, reviews and CI status go through the GitHub MCP tools.
  The session subscribes to PR activity, so CI results and reviews wake it.
- **Development branch.** `claude/cloud-credits-github-remote-projects-rtnkko`. Earlier work
  used `feature/test-cloud-utility`.

## CI runners (GitHub Actions)

- **Image.** `ubuntu-24.04`, the same release as the agent container.
- **Browsers.** Chromium comes from `playwright install --with-deps chromium`. Every job
  that runs scenarios installs it, the deploy job included.
- **Fonts.** Inter is not installed by default. The ux job installs `fonts-inter`, because
  the UX baseline was approved on a machine that has it.
- **Android.** The SDK is on the image (`ANDROID_HOME`). The `android debug APK` job adds
  JDK 21 and builds in about 1.5 minutes.
- **Docker.** Docker and Compose are present. The Compose build defaults the `extra_ca`
  secret to `deploy/no-extra-ca.pem`, because the bake builder refuses `/dev/null`.
- **Manual runs.** The agent starts them on its branch with the GitHub tools
  ("Run workflow"). They verify the slow jobs before a merge.

## Session settings that shaped the work

- **Parallel agents.** Worker agents ran packet prompts (`prompts/`) in waves; the
  coordinator merged, verified and wrote run reports.
- **Scratchpad.** It held prompts, logs and reports. It sits outside the repo, so it is
  lost with the container unless copied here.
- **Commit attribution.** Trailers come from the session. Model names stay out of the
  repository.
