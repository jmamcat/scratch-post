---
id: 0001-mvp-foundation/P02
title: Three-way merge engine in @quire/core
lane: B
depends_on: [P00]
owns:
  - quire/packages/core/src/merge/**
  - quire/packages/core/test/merge*.test.ts
reads:
  - quire/changes/0001-mvp-foundation/spec/merge/spec.md
  - quire/changes/0001-mvp-foundation/design.md
size: M
status: done
claimed_by: claude-code/claude
---

# Three-way merge engine

## Context

Implements R-MRG-01..05. Pure function; used by the server for pushes and by the client
for rebasing. Dependencies: `node-diff3`, `yaml`. May import `splitFrontmatter` from
`../markdown/frontmatter.ts` (P01); if P01 is not done yet, inline a minimal splitter
and log a decision.

## Contract

```ts
export type HunkKind = 'false-conflict' | 'whitespace' | 'intraline' | 'both-inserted' | 'text' | 'property';
export type Choice = 'current' | 'incoming' | 'both' | { text: string };
export interface Hunk {
  id: string;            // "h1", "h2", ... in document order
  kind: HunkKind;
  base: string; current: string; incoming: string;   // exact text of the region on each side
  auto: string | null;   // resolved text for auto kinds, null when unresolved
  key?: string;          // property name for kind 'property'
}
export type Segment = { type: 'stable'; text: string } | { type: 'hunk'; hunk: Hunk };
export interface MergeResult {
  text: string;          // provisional: unresolved hunks take `current`
  segments: Segment[];   // concatenating stable texts and each hunk's (auto ?? current) yields `text`
  conflicts: Hunk[];     // unresolved hunks (kinds text, property)
  review: Hunk[];        // auto-resolved hunks flagged for review (intraline, both-inserted)
  clean: boolean;        // conflicts.length === 0
}
export function merge3(base: string, current: string, incoming: string): MergeResult;
export function applyChoices(segments: Segment[], choices: Record<string, Choice>): string;
```

Silent kinds (`false-conflict`, `whitespace`) are folded into stable segments and do not
appear in `conflicts` or `review`. For `property` hunks, `both` means union when both
values are lists and falls back to `current` otherwise. A deleted key is the empty string
on that side. `both` for text hunks joins with exactly one newline between sides.

## Acceptance

```sh
pnpm -C quire --filter @quire/core test
```

Every scenario in `spec/merge/spec.md` has a test, plus: identical inputs, empty base,
CRLF input, a document where both sides delete the same paragraph.

Result: vitest: 22 merge tests passed (test/merge.test.ts).

## Decisions log

- **D-P02-1** · confidence: high
  - Question: Depend on P01's splitFrontmatter or not?
  - Did: Merge has its own minimal front matter splitter.
  - Why: P01 ran in parallel; merge must not wait for it, and the regex is five lines.
  - Reverse: Swap splitFm for splitFrontmatter from markdown/frontmatter.ts.
- **D-P02-2** · confidence: high
  - Question: Order of tiers.
  - Did: whitespace before intraline, as in the spec table; design.md updated to match.
  - Why: Cheapest silent rule first.
  - Reverse: Reorder classify() in merge3.ts.
- **D-P02-3** · confidence: high
  - Question: Both sides appended, one append extends the other.
  - Did: Keep the longer one instead of duplicating lines.
  - Why: Common when one device synced part of the same edit.
  - Reverse: Remove the prefix checks in insertBoth().
