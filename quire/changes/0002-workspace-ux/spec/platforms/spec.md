---
capability: platforms
prefix: PLT
---

# Platforms

## ADDED Requirements

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
