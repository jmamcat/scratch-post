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
status: todo
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

## Decisions log
