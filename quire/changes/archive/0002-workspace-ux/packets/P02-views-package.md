---
id: 0002-workspace-ux/P02
title: "@quire/views: pure grouping functions, and setProperty in @quire/vault"
lane: B
depends_on: [P00]
owns:
  - quire/packages/views/src/**
  - quire/packages/vault/src/properties.ts
borrows:
  - quire/packages/vault/src/index.ts  # add one export line for properties.ts
reads:
  - quire/changes/0002-workspace-ux/**
  - quire/packages/**
size: M
revision: 1
status: done
claimed_by: claude-code/tier-B
---

# @quire/views and setProperty

## Context

Pure functions behind the sidebar views (R-VIEW-02 to R-VIEW-05), the graph (R-NAV-08,
R-NAV-09) and property editing (R-VLT-07, R-VIEW-05 board moves). No I/O, no React. Other
packets (P03 views UI, P04 graph, P06 properties) build on these signatures in parallel,
so keep them exactly. The current `packages/views/src/index.ts` holds the contract as stubs:
replace the stubs with implementations (split into files by concern, e.g. `domains.ts`,
`tags.ts`, `timeline.ts`, `board.ts`, `graph.ts`, and re-export from `index.ts`).

There are no unit tests in this project. Your code is verified by the scenarios of the
packets that use it; still, check your functions with a throwaway script while working
(delete it before you finish).

## Contract

```ts
// @quire/views (types already in index.ts; keep them)
export interface NoteInfo { path: string; text: string; modifiedAt?: string; device?: string }
export interface Group { key: string; label: string; items: string[] }   // items: paths sorted by title (titleOf from @quire/vault), case-insensitive
export interface TagNode { tag: string; name: string; count: number; notes: string[]; children: TagNode[] }
export interface GraphData { nodes: { path: string; title: string; degree: number }[]; edges: { from: string; to: string }[] }

export function domainOf(note: NoteInfo): string;
export function groupByDomain(notes: NoteInfo[]): Group[];
export function tagTree(notes: NoteInfo[]): TagNode[];
export function groupByTime(notes: NoteInfo[], now: Date): Group[];
export function groupByProperty(notes: NoteInfo[], key: string): Group[];
export function linkGraph(notes: NoteInfo[], resolve: (target: string, from: string) => string | null): GraphData;
export function neighbourhood(graph: GraphData, focus: string, depth: number): GraphData;

// @quire/vault (new file packages/vault/src/properties.ts, exported from index.ts)
export type PropertyValue = string | number | boolean | string[] | null;   // null removes the key
export function setProperty(text: string, key: string, value: PropertyValue): string;
```

Rules:

- `domainOf` (R-VIEW-02), first that applies: front matter `domain` (string) → its value;
  file name `YYYY-MM-DD.md` (any folder) → `Journal`; first tag (front matter `tags` first,
  then inline; use `extractTags` from `@quire/render`) → its top segment; top-level folder;
  else `Unsorted`. Return the label in title case (`money` → `Money`, `game-dev` →
  `Game-dev`, `gamedev` → `Gamedev`). `groupByDomain` sorts groups by label with `Unsorted`
  last; `key` is the label lower-cased.
- `tagTree`: nodes per tag segment, `count` = number of distinct notes having the tag or a
  nested one; children sorted by name; top level sorted by name.
- `groupByTime` buckets by `modifiedAt` in local time: `Today` (same date as `now`),
  `Yesterday`, `This week` (within 7 days), `This month` (within 30 days), `Older` (older or
  unknown). Only non-empty groups, in that order; items newest first (not by title).
- `groupByProperty(notes, key)`: one group per distinct value (`String(value)`; for lists,
  the first element), labels as written, sorted case-insensitively; notes without the key go
  to a final group labelled `No <key>` (for example `No status`).
- `linkGraph`: a node per note (title = `titleOf`), an edge per resolved link (dedupe
  `from→to` pairs, no self-loops; use `extractLinks` from `@quire/render` and `resolve`);
  `degree` = edges touching the node.
- `neighbourhood`: nodes within `depth` hops of `focus`, following edges in both
  directions, with the edges between them.
- `setProperty`: change, add or remove one top-level key of the YAML front matter and
  return the full new text. Keep the body byte for byte. Adding the first key creates
  `---\n<key>: <value>\n---\n` at the top. Removing the last key removes the block. Keep the
  other keys' text unchanged where possible (edit the YAML document with the `yaml`
  package's `parseDocument` so comments and order survive). Scenario expectations to meet:
  `---\nstatus: draft\n---\nBody\n` with status=done → `---\nstatus: done\n---\nBody\n`;
  `Body\n` with owner=jo → `---\nowner: jo\n---\nBody\n`; `---\nowner: jo\n---\nBody\n`
  with owner=null → `Body\n`.

## Acceptance

```sh
pnpm -C quire --filter @quire/views typecheck
pnpm -C quire --filter @quire/vault typecheck
pnpm -C quire deps
```

Plus a throwaway check script (deleted afterwards) whose output you summarise here for
each function. The behaviour gate is the scenarios of P03, P04 and P06.

### Results

- `@quire/views typecheck` and `@quire/vault typecheck`: clean. `pnpm deps`: no violations
  (148 modules). `check-structure.py`: 0 violations (5 S8 warnings, none in these packages).
- Check script (deleted): `domainOf` gave Money (folder and `domain: money`), Journal
  (`2026-10-16.md`), Gamedev (`#gamedev/levels`), Game-dev (`tags: [game-dev]`), Unsorted
  (loose root note). `groupByDomain` sorted by label with Unsorted last.
  `tagTree` gave `idea` count 3 over `idea/raw` count 2 over `idea/raw/deep`, case-merged,
  sorted by name. `groupByTime` gave Today (newest first), Yesterday, This week, This month,
  Older (60 days, no date, bad date). `groupByProperty` merged `todo`/`Todo`, list value uses
  first element, `No status` last. `linkGraph` dropped duplicates, unresolved, self and
  non-note links; degrees correct. `neighbourhood` depth 1, 2, 0 and unknown focus correct.
  `setProperty` met the three scenario strings exactly, and also: kept comments, quotes, blank
  lines, inline lists and long lines; CRLF kept; empty block, trailing-space fence, missing
  trailing newline all fine; throws on a non-map or invalid block.

## Decisions log

- **D-P02-1** · confidence: med
  - Question: what does "title case" mean for a domain label.
  - Did: capitalise the first letter of each whitespace-separated word and lower-case the rest (`MONEY` gives `Money`, `home lab` gives `Home Lab`, `game-dev` gives `Game-dev`).
  - Why: matches the contract examples and makes labels deterministic whatever the source casing.
  - Reverse: `titleCase` in `packages/views/src/domains.ts`.
- **D-P02-2** · confidence: med
  - Question: what `TagNode.notes` holds, and how tags that differ only in case combine.
  - Did: `notes` is the same set `count` counts (tag plus nested tags), sorted by title, so `count === notes.length`. Tags match case-insensitively; the first spelling seen names the node.
  - Why: R-VIEW-03 opens a tag search, which includes nested tags; Obsidian treats tags case-insensitively.
  - Reverse: `finish` and the `level.get(key)` lookup in `packages/views/src/tags.ts`.
- **D-P02-3** · confidence: med
  - Question: are board values `Todo` and `todo` one column, and are empty columns listed.
  - Did: merged case-insensitively with the first spelling as label; values are trimmed; empty strings, null and objects count as missing; only non-empty groups are returned, with `No <key>` last. A new column named by the user (UI concern) is not produced here.
  - Why: the contract says one group per distinct value and `key` is lower case, so a case-sensitive split would give duplicate keys.
  - Reverse: `groupByProperty` in `packages/views/src/board.ts`.
- **D-P02-4** · confidence: med
  - Question: `degree` of nodes in a `neighbourhood` result.
  - Did: recomputed over the kept edges only, so `degree` always equals the edges touching the node in that `GraphData`. An unknown `focus` returns an empty graph; `depth` 0 returns just the focus.
  - Why: keeps the `GraphData` invariant. P04 can size nodes by full-graph degree by looking it up in the global graph.
  - Reverse: `withDegrees` use in `neighbourhood`, `packages/views/src/graph.ts`.
- **D-P02-5** · confidence: low
  - Question: what `setProperty` does when the existing front matter is invalid YAML, duplicates a key, or is not a map.
  - Did: throws `Error('front matter is not a valid YAML map')` and leaves the text alone.
  - Why: silently returning the text loses the user's edit with no feedback; rewriting would destroy hand-written text. P06 should catch it and show the message.
  - Reverse: the early `throw` in `packages/vault/src/properties.ts`.
- **D-P02-6** · confidence: high
  - Question: how to keep other keys' text unchanged.
  - Did: only the text between the fences is replaced; scalars are mutated in place (quote style and trailing comments survive), inline lists stay inline, `lineWidth: 0` and `flowCollectionPadding: false` stop re-folding and `[ a, b ]` padding.
  - Why: contract asks to keep other keys unchanged where possible.
  - Reverse: `toString` options in `packages/vault/src/properties.ts`.
- **D-P02-7** · confidence: high
  - Question: where the shared types live.
  - Did: moved the interfaces to `packages/views/src/types.ts` and re-exported them from `index.ts` (same public names), so the implementation files import them without a cycle (S6). Shared sort helpers are in `by-title.ts`.
  - Why: structure rules S3 and S6.
  - Reverse: none needed.
