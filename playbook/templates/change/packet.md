---
id: <change-id>/P<NN>
title: <imperative title>
lane: <lane letter>            # packets in different lanes may run in parallel
depends_on: [<packet ids>]     # must be done before this one starts
owns:                          # paths this packet may create or edit; nobody else may
  - <glob>
reads:                         # paths it may read but must not edit
  - <glob>
size: S | M | L                # S < 300 changed lines, M < 800, L split it
status: todo | doing | done | blocked
---

# <Title>

## Context

Everything an agent with no prior conversation needs: the goal, the spec
requirements it satisfies (`quire/spec/<cap>/spec.md#R-...`), and the contracts it
must honour. Assume the agent has only this file, the files under `reads`, and a shell.

## Contract

Types, function signatures, HTTP routes or file formats this packet must expose or
consume. Copy them here verbatim; do not say "see design.md".

## Steps

1. Ordered, concrete steps.

## Acceptance

Commands that must exit 0, run from the repo root, and the scenarios that must pass:

```sh
<check command from playbook.yaml>
<scenarios command> --grep "@R-XXX-01|@R-XXX-02"
```

Scenarios: `@R-XXX-01` <name>, `@R-XXX-02` <name>.

## Decisions log

Append here while working. Format in the playbook's `core/decisions.md`.
