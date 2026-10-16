---
capability: render
prefix: RND
---

# Rendering

How Markdown is turned into the reading view. The dialect is Obsidian Flavored Markdown
(OFM): CommonMark plus GFM plus the Obsidian extensions listed here.

## ADDED Requirements

### Requirement R-RND-01: CommonMark and GFM

The system SHALL render CommonMark plus GFM tables, strikethrough, autolinks and task lists (`- [ ]`, `- [x]`).

#### Scenario: Task list

- **WHEN** the text is `- [x] done\n- [ ] todo`
- **THEN** the output has two list items with checkboxes, the first checked

### Requirement R-RND-02: Wikilinks

The system SHALL render `[[target]]`, `[[target|alias]]`, `[[target#heading]]` and `[[target#^block]]` as internal links, resolved with the rules in R-NAV-02, and SHALL mark links whose target does not exist as unresolved.

Grounding: OBS-F-004, OBS-F-006, OBS-F-007, OBS-F-047

#### Scenario: Alias

- **GIVEN** `Projects/Alpha.md` exists
- **WHEN** the text is `see [[Alpha|the project]]`
- **THEN** the output links to `Projects/Alpha.md` with the label `the project`

#### Scenario: Unresolved

- **WHEN** the text is `[[Nowhere]]` and no such note exists
- **THEN** the link carries the class `unresolved`

### Requirement R-RND-03: Embeds

The system SHALL render `![[file.png]]` (and other image extensions) as an image, and `![[note]]` as an embed block that links to the note; full transclusion is deferred.

### Requirement R-RND-04: Callouts

The system SHALL render a blockquote starting `> [!type] Optional title` as a callout of that type, and `> [!type]-` / `> [!type]+` as a collapsible callout (collapsed / expanded by default).

Grounding: OBS-F-012 (baseline), CNF-F-013, CNF-F-014, NOT-F-006, NOT-F-008

#### Scenario: Foldable

- **WHEN** the text is `> [!tip]- Hidden\n> body`
- **THEN** the output is a collapsed `<details>` element with summary `Hidden`

### Requirement R-RND-05: Inline extensions

The system SHALL render `==highlight==` as a highlight, `#tag` and `#nested/tag` as tag links, footnotes `[^1]` with their definitions, and SHALL omit `%%comment%%` text from the output.

### Requirement R-RND-06: Safe output

The system SHALL escape raw HTML in Markdown rather than render it, so rendered notes cannot run scripts.

#### Scenario: Script

- **WHEN** the text contains `<script>alert(1)</script>`
- **THEN** the output contains the escaped text and no `<script>` element

### Requirement R-RND-07: Front matter is not body content

The system SHALL exclude a leading YAML front matter block from the rendered body and expose it as properties.

Grounding: OBS-F-100, OBS-F-105
