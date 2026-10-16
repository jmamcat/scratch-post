# Reference roles

Every reference has exactly one role. The role decides how much weight its behaviour
carries in the feature matrix and how often it is reviewed.

| Role | Meaning | Matrix weight | Default cadence |
| --- | --- | --- | --- |
| `baseline` | Source of defaults. When a behaviour is unspecified, copy this product. | Breaks ties | per-change |
| `primary` | Main reference for a domain (named in REFERENCE.md). Its features are parity candidates. | Proposes features | monthly or per-change for its domain |
| `secondary` | Consulted for specific patterns; not a parity target. | Informs design | quarterly |
| `tracking` | Watched for ideas and direction; never drives scope on its own. | None | quarterly |

A product may be `primary` for one domain only; say which in "How we use it", for
example "primary for sync, offline and mobile".

## Review cadence

| Cadence | Trigger |
| --- | --- |
| `per-change` | Read before writing any change proposal that touches its domain. |
| `monthly` | First run of each month: check release notes, update features.md. |
| `quarterly` | First run of each quarter. |
| `on-release` | When upstream tags a release (`scripts/refs.sh status`). |

A review appends a row to the reference's Review log and, for open source, may move the
submodule pin with `scripts/refs.sh update <id>`.

## Intake checklist

1. Copy `method/templates/REFERENCE.md` to `references/<id>/REFERENCE.md`.
2. Fill the front matter. `included_on` is today. Propose a role; a human confirms it.
3. Write `product/features.md`, `product/ux-principles.md`, `product/data-model.md`,
   `product/visuals/README.md`. IDs use a 2-4 letter prefix unique to the reference.
4. Open source: register the repo as a shallow submodule under `upstream/` and pin it.
   Closed source: no upstream; specs and capture checklists only.
5. Add the reference to `references/README.md` and its features to
   `references/feature-matrix.md`.

## Visuals

Screenshots of closed-source products are never committed. The capture checklist in
`product/visuals/README.md` lists what to capture and links official pages that show
it. Captures live in `product/visuals/captures/`, which is gitignored, so each person or
agent keeps a local copy.

## Retirement

Change the role to `tracking`, or remove the folder and its submodule, in a change
proposal that explains why. Matrix rows that cited it keep their decision.
