# Spec format

Specs describe behaviour, not implementation. They live in `<target>/spec/<capability>/spec.md`
and are only edited by archiving a change.

## Capability spec

```markdown
---
capability: <cap-id>          # kebab-case, matches the folder name
prefix: <CAP>                 # 2-5 uppercase letters used in requirement IDs
---

# <Capability name>

<One paragraph purpose.>

## Requirements

### Requirement R-<CAP>-01: <short title>

The system SHALL <behaviour>.

Grounding: OBS-F-012 (baseline), NOT-F-004 (adapted)

#### Scenario: <name>

- **GIVEN** <state>
- **WHEN** <action>
- **THEN** <observable result>
- **AND** <more result>
```

Rules:

- One `SHALL` statement per requirement. Use `SHOULD` only for soft guidance.
- Every requirement has at least one scenario. Scenarios are written so a test can be
  derived from them directly; packets cite them as `R-SYNC-03/S2` (second scenario).
- `Grounding` cites reference feature IDs. Omit it for purely internal requirements.
- IDs are never reused. Removed requirements leave a tombstone line:
  `### Requirement R-SYNC-07: (removed in 0004-...)`.

## Change deltas

A change carries deltas under `changes/<change-id>/spec/<cap-id>/spec.md`:

```markdown
## ADDED Requirements
### Requirement R-SYNC-08: ...

## MODIFIED Requirements
### Requirement R-SYNC-03: ...      (full new text, replaces the old one)

## REMOVED Requirements
### Requirement R-SYNC-05
Reason: ...
```

A new capability's delta contains only `ADDED Requirements` plus the front matter and
purpose paragraph. On archive, `bin/archive-change.py` applies the deltas to `spec/`
mechanically and moves the change to `changes/archive/`.
