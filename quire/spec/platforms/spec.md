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

### Requirement R-PLT-04: Optional token

The server SHALL require `Authorization: Bearer <QUIRE_TOKEN>` (or `?token=` for SSE and WebSocket) on every route except `/api/health` when `QUIRE_TOKEN` is set.

#### Scenario: Missing token

- **GIVEN** a cloud server that requires the token `s3cret`
- **THEN** a request for the note list without a token is refused
- **AND** a request for the note list with the token succeeds
- **AND** the health check without a token succeeds

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
