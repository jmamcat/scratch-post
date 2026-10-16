# @quire/merge

Three-way merge of two edits of one Markdown note: line diff3, per-property front matter,
and the collision tiers (silent, flagged for review, needs a decision).

- Public API: `merge3`, `applyChoices`, `Segment`, `Hunk`, `Choice`.
- Depends on: `node-diff3`, `yaml`. Pure.
- Specs: `R-MRG-*`.
