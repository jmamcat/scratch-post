---
# Machine-readable header. Agents read this block; keep keys stable.
id: <kebab-id>                # folder name under references/
name: <Product name>
role: primary | baseline | secondary | tracking
review_cadence: per-change | monthly | quarterly | on-release
source: open | closed | open-format   # open-format = closed app, open file format/docs
license: <SPDX id or "proprietary">
included_on: YYYY-MM-DD
last_reviewed: YYYY-MM-DD
upstream:                     # empty for closed source
  - path: upstream/<name>     # git submodule path, relative to this folder
    url: https://github.com/<owner>/<repo>
    branch: <default branch>
    pinned: <commit sha>
---

# <Product name>

## Why it is in the set

One paragraph: what question this reference answers for the target product.

## How we use it

- **Role:** what the role above means for this product in practice
  (for example "baseline: when unsure, copy its default").
- **Review cadence:** when someone re-reads it and what triggers an early review.
- **Borrow:** capabilities or principles we deliberately take.
- **Reject:** what we deliberately leave out, with a one-line reason each.

## Product definition

| File | Contents |
| --- | --- |
| `product/features.md` | Feature inventory, grouped, with IDs (`<ID>-F-###`) |
| `product/ux-principles.md` | Interaction and design principles, with IDs (`<ID>-UX-##`) |
| `product/data-model.md` | Storage format, document model, sync model |
| `product/visuals/README.md` | What to capture and where (captures are gitignored) |

## Upstream (open source only)

How to fetch and update the copy: `scripts/refs.sh update <id>`.
Paths inside the upstream worth reading first.

## Review log

| Date | Reviewer | Upstream rev | Notes |
| --- | --- | --- | --- |
| YYYY-MM-DD | <agent or human> | <sha or "n/a"> | Initial inclusion |
