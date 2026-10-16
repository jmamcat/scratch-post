---
capability: platforms
prefix: PLT
---

# Platforms

## REMOVED Requirements

### Requirement R-PLT-04

Reason: replaced by R-ACC-01 (a token is required) and R-ACC-03 (tokens only in the `Authorization` header; tickets for event streams and live connections). Its scenario moved to R-ACC-01.

## ADDED Requirements

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

- **GIVEN** a cloud server
- **AND** device `pixel` with the demo notes
- **THEN** in every theme the standard screens on `pixel` pass the UX gate
