---
capability: platforms
prefix: PLT
---

# Platforms

## Requirements

### Requirement R-PLT-01: Cloud mode

The server in `cloud` mode SHALL serve the API, the event stream, live rooms and, when built, the web client from one port.

Layer: ui

#### Scenario: The app loads from the server

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` has `welcome.md` reading `# Welcome\n`
- **AND** `pixel` opens `welcome.md` in reading view
- **THEN** the reading view on `pixel` shows the text `Welcome`

### Requirement R-PLT-02: Local mode

The server in `local` mode SHALL behave like cloud mode for its own clients and additionally replicate with `QUIRE_UPSTREAM` (R-SYN-09).

#### Scenario: A local node serves its own devices

- **GIVEN** a cloud server
- **AND** a local node `nas` replicating with the cloud server
- **AND** device `desk` connected to `nas`
- **AND** device `lan` connected to `nas`
- **WHEN** `desk` has `shared.md` reading `on the lan\n`
- **AND** `lan` syncs
- **THEN** `shared.md` on `lan` reads `on the lan\n`

### Requirement R-PLT-03: Android

The project SHALL include a Capacitor Android wrapper for the web client, and the client SHALL let the user set the server URL and token in Settings so it works outside a browser origin.

Layer: ui

#### Scenario: Point the app at a server

- **GIVEN** a cloud server that requires the token `s3cret`
- **AND** device `phone`
- **WHEN** `phone` has `t.md` reading `token works\n`
- **THEN** the cloud server has `t.md` reading `token works\n`

### Requirement R-PLT-04: (removed in 0003-production-hardening)

Reason: replaced by R-ACC-01 (a token is required) and R-ACC-03 (tokens only in the `Authorization` header; tickets for event streams and live connections). Its scenario moved to R-ACC-01.

### Requirement R-PLT-05: Themes

The client SHALL offer five themes, each with light and dark variants that follow the system setting, and each giving heading levels 1 to 3 visibly different styles (size plus colour, weight or marker):

| Theme | Inspired by | Heading idea |
| --- | --- | --- |
| Default | Obsidian's default theme | size scale, one accent colour |
| Minimal | the Minimal community theme | quiet type, levels by weight and spacing |
| Things | the Things community theme | a distinct colour per level |
| Paper | Notion's page typography | large serif H1, roomy spacing |
| Atlas | Confluence and Atlassian | blue structured headings with a rule under H1 |

The choice is stored per device. Themes are written for Quire and do not copy CSS from the products that inspired them.

Layer: ui

Grounding: OBS-F-214, OBS-F-217, NOT-F-019, CNF-F-039

#### Scenario: Pick a theme

- **GIVEN** a cloud server
- **AND** device `pixel`
- **WHEN** `pixel` picks the theme `Things`
- **AND** `pixel` reloads the app
- **THEN** the app on `pixel` uses the theme `Things`

#### Scenario: Heading levels look different in every theme

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `h.md` reading `# One\n\n## Two\n\n### Three\n`
- **WHEN** `pixel` opens `h.md` in reading view
- **THEN** in every theme the headings on `pixel` look different from each other

### Requirement R-PLT-06: Offline app start

After the app has loaded once, it SHALL start with no network from files a service worker cached, and show the notes stored on the device; when a new version has been deployed it SHALL offer "Reload to update" rather than reload by itself.

Layer: ui

#### Scenario: Start offline

- **GIVEN** a cloud server
- **AND** device `pixel`
- **AND** `pixel` has `a.md` reading `hello`
- **WHEN** `pixel` goes offline
- **AND** `pixel` reloads the app
- **AND** `pixel` opens `a.md`
- **THEN** `a.md` on `pixel` reads `hello`

### Requirement R-PLT-07: First-load budget

The web build's first-load JavaScript SHALL stay under 320 kB gzip, and the graph, vault history, review inbox, settings, version history and the live editing libraries SHALL load when first used.

Layer: system

#### Scenario: Budget

- **GIVEN** the web app is built
- **THEN** the first-load JavaScript is under 320 kB gzip
- **AND** the first-load JavaScript does not include `d3-force`
- **AND** the first-load JavaScript does not include `yjs`

### Requirement R-PLT-08: UX gate

In every theme, in light and dark, the standard screens (editor, reading view, sidebar views, graph, settings, review inbox, vault history) SHALL have no serious or critical accessibility violations, SHALL meet WCAG 2.2 AA text contrast, SHALL reflow at 320 px width without horizontal scrolling, SHALL show a visible focus indicator on every focusable control, and SHALL reach a UX score of at least 85 per screen and 70 per category, scored by the UX scorer (`playbook/modules/ux`), with no screen dropping against the approved baseline.

Layer: ui

#### Scenario: Every theme passes

Tags: @gate-ux

- **GIVEN** a cloud server
- **AND** device `pixel` with the demo notes
- **THEN** in every theme the standard screens on `pixel` pass the UX gate
