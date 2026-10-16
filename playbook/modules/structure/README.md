# Module: structure

A code structure standard that keeps a codebase easy for a person to walk through and easy
for an agent to change without breaking things. It is language-agnostic at the rule level and
mechanically checkable at the tool level.

**Primary standard:** vertical slices by capability (package-by-feature, "screaming"
architecture), with a functional core and an imperative shell inside each slice.
**Supporting conventions:** an `ARCHITECTURE.md` codemap, one short README per module,
decision records for boundary changes.

Why this and not the alternatives: Feature-Sliced Design is checkable but frontend-only;
hexagonal and clean architecture add layers whose indirection costs more attention than it
saves in most codebases; cognitive-load research (deep modules, locality of behaviour) favours
few deep modules named after what they do. Capability slices map one-to-one onto spec
capabilities, so a requirement ID leads straight to a folder. Sources in `sources.md`.

## Folder template

```
<target>/
  ARCHITECTURE.md              codemap: capabilities, how they depend on each other, entry points
  packages/<capability>/       pure libraries: no I/O, no framework
    src/index.<ext>            the only public entry
    README.md                  15 lines or fewer: purpose, public API, depends on
  apps/<app>/
    src/<capability>/          one folder per capability the app implements
      index.<ext>              public API of the capability inside the app
      core/                    pure logic (optional when trivial)
      shell/                   I/O adapters: http, fs, db, ui (optional when trivial)
      README.md
    src/shared/                cross-cutting code; imports no capability
    src/main.<ext>             composition root: wires capabilities together
```

Small capabilities may be a single file (`src/<capability>.ts`); split into `core/` and
`shell/` once the file mixes pure logic with I/O and passes about 200 lines.

## Rules

| # | Rule | Checked by |
| --- | --- | --- |
| S1 | Apps may import packages. Packages never import apps. Apps never import each other. | dependency rules |
| S2 | Folder names are capability IDs from the specs (`vault`, `sync`, ...), kebab-case. | review; `bin/check-structure.py` lists unknown folders |
| S3 | Each module has one public entry; no deep imports into another module. | dependency rules, package `exports` |
| S4 | `core/` and `packages/` import no I/O, no framework, no `shell/`. | dependency rules |
| S5 | Cross-capability imports go through public entries and appear in ARCHITECTURE.md's dependency table. | dependency rules |
| S6 | No import cycles, between modules or files. | dependency rules |
| S7 | `shared/` imports no capability. | dependency rules |
| S8 | Files: soft limit 300 lines, hard limit 500. Functions about 60 lines. Prefer few deep modules over many shallow ones. A file over the soft limit is a warning ("consider splitting this when you next change it"); over the hard limit it fails `check`. | `bin/check-structure.py` |
| S9 | Names say what the code does (`three-way-merge.ts`). No `utils`, `helpers`, `misc`, `common` folders or files. | `bin/check-structure.py` |
| S10 | Every module has a README of 15 lines or fewer; ARCHITECTURE.md lists every module. | `bin/check-structure.py` |
| S11 | Changing a rule or a dependency between capabilities needs a decision record in the change. | review |
| S12 | Comments explain why, not what; no commented-out code. | review |

There is no "tests next to source" rule: verification lives in the scenarios module.

## Enforcement by language

| Language | Dependency rules (S1, S3 to S7) | Size and naming (S8 to S10) |
| --- | --- | --- |
| TypeScript / JavaScript | dependency-cruiser config in CI; package.json `exports` | `bin/check-structure.py` |
| Python | import-linter contracts: `layers` (shell over core), `independence` (capabilities), `forbidden` (packages to apps) | `bin/check-structure.py` |
| Go | `internal/` for shells, depguard (golangci-lint) allowlists; the compiler forbids cycles | `bin/check-structure.py` |
| Other | the language's module system plus a forbidden-imports linter; document the gap in ARCHITECTURE.md | `bin/check-structure.py` |

`bin/check-structure.py` is language-neutral: it reads `structure` settings from
`playbook.yaml` (roots, extensions, limits, capability names) and checks S2, S8, S9 and S10.

## ARCHITECTURE.md shape

1. One paragraph: what the system is.
2. Codemap: a table of modules (path, capability, one-line purpose).
3. Dependencies: a table "module may import" that matches the dependency rules.
4. Entry points: how to run it, where requests enter, where data lives.
5. Invariants: the few rules that are not obvious from the code (for example "the revision
   log is append-only").

Keep `AGENTS.md` short: point to ARCHITECTURE.md and the playbook. Write only what an agent
cannot infer from the code.
