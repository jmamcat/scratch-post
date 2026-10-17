# Module: references

A reference set: products, systems or codebases kept beside the target so agents can learn
from them, stay compatible with them, or reproduce their behaviour. Turn it on when the
target is defined by comparison (a product like X but leaner), when existing systems must be
preserved (overhaul, port, combine), or when an open-source implementation is worth studying.

## Layout

```
<references>/
  README.md               index: id, role, domain, cadence, source, license, upstream, dates
  feature-matrix.md       target features mapped to reference feature IDs: adopt | adapt | defer | reject
  <id>/
    REFERENCE.md          from REFERENCE.template.md: inclusion date, role, cadence, borrow/reject, review log
    product/
      features.md         inventory with IDs <PREFIX>-F-###
      ux-principles.md    <PREFIX>-UX-## (UI products) or design principles (libraries, services)
      data-model.md       storage, formats, sync and consistency
      visuals/README.md   capture checklist; captures/ is gitignored
    upstream/<repo>       open source only: pinned shallow git submodule, read-only
```

Roles and review cadence: `roles.md`. Fetch, update and check upstream copies:
`bin/refs.sh` (reads `references` from `playbook.yaml`).

## Using the existing system as a reference

For overhaul, migrate-component, port-language and combine-systems, the current system is a
reference with role `baseline`, and its code is the upstream copy (a submodule pinned at the
tag or commit being replaced). Its `product/` files are the characterisation: what it does today.

## Rules

- Never copy code from an upstream copy into the target. Check licenses: copyleft references
  (AGPL, GPL) are study-only for permissively licensed targets.
- Never commit screenshots of closed-source products.
- Features are cited by ID in the feature matrix and in spec `Grounding:` lines, so every
  borrowed behaviour can be traced to where it came from.
