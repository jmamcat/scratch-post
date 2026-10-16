---
id: 0001-mvp-foundation/P01
title: Markdown parsing, link resolution and OFM rendering in @quire/core
lane: A
depends_on: [P00]
owns:
  - quire/packages/core/src/markdown/**
  - quire/packages/core/src/paths.ts
  - quire/packages/core/src/search.ts
  - quire/packages/core/test/markdown*.test.ts
  - quire/packages/core/test/paths.test.ts
  - quire/packages/core/test/search.test.ts
reads:
  - quire/changes/0001-mvp-foundation/spec/render/spec.md
  - quire/changes/0001-mvp-foundation/spec/navigate/spec.md
  - quire/changes/0001-mvp-foundation/spec/vault/spec.md
  - references/obsidian/product/data-model.md
size: M
status: done
claimed_by: claude-code/claude
---

# Markdown parsing, link resolution and OFM rendering

## Context

Implements R-RND-01..07, R-NAV-02, R-NAV-03, R-NAV-04, R-NAV-06 (extraction only) and
R-VLT-02 as pure functions usable in Node and the browser. Dependencies: `markdown-it`,
`markdown-it-footnote`, `markdown-it-mark`, `yaml`.

## Contract

```ts
// paths.ts
export class InvalidPathError extends Error {}
export function normalizePath(p: string): string;          // R-VLT-02; throws InvalidPathError
export function titleOf(path: string): string;             // "a/B c.md" -> "B c"
export function resolveLink(target: string, fromPath: string, paths: readonly string[]): string | null; // R-NAV-02

// markdown/frontmatter.ts
export interface Frontmatter { data: Record<string, unknown> | null; raw: string | null; body: string; bodyStart: number }
export function splitFrontmatter(text: string): Frontmatter;   // raw = text between the --- fences, data = parsed map or null

// markdown/extract.ts
export interface WikiLink { target: string; alias?: string; heading?: string; block?: string; embed: boolean; start: number; end: number }
export function extractLinks(text: string): WikiLink[];   // [[...]], ![[...]], and [label](relative.md); skips code spans/blocks
export function extractTags(text: string): string[];      // R-NAV-03, de-duplicated, front matter + inline
export interface Heading { level: number; text: string; line: number; slug: string }
export function extractHeadings(text: string): Heading[];

// markdown/render.ts
export interface RenderOptions {
  resolve?: (target: string) => string | null;            // wikilink target -> vault path or null
  href?: (path: string, heading?: string) => string;      // default "#/" + encodeURI(path)
  tagHref?: (tag: string) => string;                      // default "#/tag/" + tag
}
export function renderMarkdown(text: string, opts?: RenderOptions): string;  // HTML string, html: false

// search.ts
export interface SearchHit { path: string; title: string; snippet: string; score: number }
export function search(docs: Iterable<{ path: string; text: string }>, query: string, limit?: number): SearchHit[];
```

Rendered HTML classes: internal link `a.internal-link[data-path]`, unresolved adds
`.unresolved`, tag `a.tag`, highlight `mark`, callout `div.callout[data-callout=<type>]`
with `div.callout-title` and `div.callout-content`, foldable callout uses
`details.callout` / `summary.callout-title`, note embed `div.embed[data-path]`.

## Acceptance

```sh
pnpm -C quire --filter @quire/core test
pnpm -C quire --filter @quire/core typecheck
```

Every scenario in the render and navigate specs has a test.

Result (2026-10-16):

- `pnpm -C quire --filter @quire/core test`: exit 0. 5 files, 121 tests passed (P01 owns
  4 files, 99 tests: paths 32, markdown-render 39, markdown-extract 19, search 9; the
  other 22 are merge.test.ts from P02).
- `pnpm -C quire --filter @quire/core typecheck`: exit 0.
- Spec scenarios covered, by test title: R-RND-01 "Scenario: Task list", R-RND-02
  "Scenario: Alias" and "Scenario: Unresolved", R-RND-04 "Scenario: Foldable", R-RND-06
  "Scenario: Script", R-NAV-01 "Scenario: Backlink appears" (computed from
  `extractLinks` + `resolveLink`), R-NAV-02 "Scenario: Shortest path wins", R-NAV-03
  "Scenario: Both sources", R-VLT-02 "Scenario: Escape attempt" and "Scenario:
  Normalisation". R-NAV-05 and R-NAV-07 have no scenarios and are UI work outside P01.

Files: `src/paths.ts`, `src/search.ts`, `src/markdown/{frontmatter,extract,render,md,syntax}.ts`,
`src/markdown/vendor.d.ts`, `test/{paths,search,markdown-render,markdown-extract}.test.ts`.
`md.ts` holds the one shared markdown-it instance, so the renderer, the tag extractor and
the heading extractor see the same token stream (same code skipping, same slugs).

Needs from P00: nothing.

## Decisions log

- **D-P01-1** · confidence: med
  - Question: R-VLT-02 says paths "do not start with `.`". Does that apply to every segment, and are other characters or Unicode forms normalised?
  - Did: Reject any segment that starts with `.` (so `.obsidian/x.md` and `a/.trash/b.md` are refused), reject C0 control characters, require a lower-case `.md` suffix, and normalise to Unicode NFC after turning `\` into `/`. No other characters are rejected; no trimming of slashes (a leading `/` or `//` is rejected as an empty segment rather than stripped).
  - Why: Obsidian hides and does not sync dot folders (data-model section 1), so a dot segment anywhere is outside the vault content. NFC stops macOS (NFD) and browser (NFC) spellings of one name from becoming two documents. Control characters are never valid in file names. The spec lists rejection, not repair, for empty segments.
  - Reverse: `normalizePath` in `quire/packages/core/src/paths.ts` and its tests in `test/paths.test.ts`.
- **D-P01-2** · confidence: med
  - Question: R-NAV-02 step 3 says "shortest path": by characters or by folder depth? And what does a target with a folder (`[[Projects/Alpha]]`) match when it is neither exact nor relative?
  - Did: Shortest by string length, then plain code-unit order. A target that contains `/` matches, case-insensitively, any path that ends with `/<target>` or `/<target>.md` (Obsidian's "any file whose path ends with the linkpath"). Targets without a known extension only match `.md` files. A leading `/` means vault root. An empty target (`[[#H]]`) resolves to `fromPath`.
  - Why: Literal reading of the spec; data-model section 4 items 3 and 4.
  - Reverse: `byShortest` and step 3 in `resolveLink`, `quire/packages/core/src/paths.ts`.
- **D-P01-3** · confidence: high
  - Question: Single newlines in a paragraph.
  - Did: markdown-it `breaks: true`, so a single newline renders as `<br>`.
  - Why: Obsidian "Strict line breaks" is off by default (data-model 6.1 row 25; coordinator note).
  - Reverse: `breaks` option in `quire/packages/core/src/markdown/md.ts`.
- **D-P01-4** · confidence: med
  - Question: Which bare URLs does the GFM autolink extension link?
  - Did: Only URLs with a scheme (`https://...`, `mailto:` with scheme). linkify fuzzy links and fuzzy emails are off.
  - Why: With fuzzy links on, `notes.md` became a link to the `.md` country domain, which is wrong in a Markdown vault. Side effect: bare `www.example.com` is not linked.
  - Reverse: `md.linkify.set(...)` in `quire/packages/core/src/markdown/md.ts`.
- **D-P01-5** · confidence: med
  - Question: How to render links when no `resolve` option is given, and same-note links (`[[#Heading]]`)?
  - Did: Without a resolver every link counts as resolved, with `.md` implied on targets that have no known file extension. An unresolved link gets `data-path` set to the implied path (`[[Nowhere]]` gives `Nowhere.md`) so the UI can create it on click. Same-note links pass `''` to `resolve`; if that returns a path they are ordinary internal links, otherwise they render without `data-path` and with `href="#<heading slug>"` (or `#^blockid`). Link text without an alias is the linktext as written (`Note#Heading`).
  - Why: Contract leaves the default open; data-model section 4 item 6 (clicking an unresolved link creates the note) and 6.1 row 2 (text is linktext as written).
  - Reverse: `defaults.resolve`, `locate` and `linkHtml` in `quire/packages/core/src/markdown/render.ts`.
- **D-P01-6** · confidence: med
  - Question: Image embeds need a URL, which the contract's `RenderOptions` does not provide.
  - Did: Added optional `imageSrc?: (path) => string` to `RenderOptions` (default `encodeURI(path)`). Image embeds render `img.embed-image` (plus `.unresolved`), with `![[img.png|W]]` / `|WxH` and `![alt|W](src)` sizes. Note embeds render `div.embed[data-path]` holding an internal link when alone in a paragraph, `span.embed` when inline with other text (a div inside `<p>` is invalid HTML). PDF, audio, video, canvas and base embeds render as `.embed.embed-file` links; players and transclusion are deferred.
  - Why: R-RND-03; design non-goal allows images referenced by path; data-model 6.1 rows 3 to 5 and 8.
  - Reverse: wikilink and image rules in `quire/packages/core/src/markdown/render.ts`; the paragraph unwrap in `afterInline`, `md.ts`.
- **D-P01-7** · confidence: high
  - Question: Callout details beyond the contract classes.
  - Did: `div.callout` / `details.callout` carry `data-callout` (lower-cased type as written), `data-callout-base` (alias mapped to one of the 13 base types, unknown types `note`) and `data-callout-fold` (`+` or `-`); `[!x]+` adds `open`. Empty title defaults to the type in title case. Titles are parsed as inline Markdown. Nested callouts work.
  - Why: data-model 6.1 rows 16 and 17; coordinator note.
  - Reverse: `callouts` in `md.ts`, `callout_*` rules in `render.ts`.
- **D-P01-8** · confidence: med
  - Question: Comment (`%%`) rules, and whether links and tags inside comments count.
  - Did: A `%%` that starts a line opens a block comment that ends at the next `%%` anywhere (unclosed: hides the rest of the note). Elsewhere both markers must be on one line; an unmatched `%%` is literal. `\%%` and code keep `%%`. Comments are removed before rendering (newlines kept so line numbers stay right) and are skipped by `extractLinks`, `extractTags` and `extractHeadings`.
  - Why: data-model 6.1 rows 12 and 13. Whether Obsidian indexes links inside comments is not documented; skipping them matches what the reading view shows.
  - Reverse: `commentRanges` and `withoutComments` in `md.ts`; the masking in `extract.ts`.
- **D-P01-9** · confidence: med
  - Question: Tag details: what counts as "not purely numeric", case, and front matter string form.
  - Did: Inline tags need start of line or whitespace before `#`, allow Unicode letters, marks, digits, `_`, `-`, `/` and emoji, drop trailing `/`, and need at least one character that is not a digit or `/`. Tags inside link text are not tags. `tags` in front matter may be a list or a string; strings are split on commas and whitespace, a leading `#` is removed. Only the `tags` key is read (not the deprecated `tag`). De-duplication is case-insensitive, first spelling wins, front matter tags first.
  - Why: R-NAV-03; data-model 6.1 row 11 (case-insensitive identity) and section 3 (deprecated `tag`).
  - Reverse: `tagPattern`/`cleanTag` in `syntax.ts`, `splitTags` in `md.ts`, `frontmatterTags` in `extract.ts`.
- **D-P01-10** · confidence: med
  - Question: Task status characters and checkbox behaviour.
  - Did: `[c]` with any single character is a task; space is open, anything else is done. `li.task-list-item[data-task=c]` gets a `disabled` checkbox with `data-line` (zero-based source line, front matter included) so the UI can later toggle it.
  - Why: data-model 6.1 row 18; coordinator note. Disabled because toggling needs a write path that is not part of this packet.
  - Reverse: `blocks` in `md.ts`, `list_item_open` rule in `render.ts`.
- **D-P01-11** · confidence: med
  - Question: Heading `line` base and slug format; front matter links in `extractLinks`.
  - Did: `Heading.line` is zero-based in the full text (front matter lines counted). Slugs are lower case, punctuation removed, whitespace runs to `-`, duplicates get `-1`, `-2`; the renderer sets the same value as the heading `id`. `extractLinks` also returns quoted `[[links]]` in front matter values (never as embeds), and Markdown links to any vault path (not only `.md`). Block IDs (`text ^id`) are hidden in the output and become `id="^id"` on the paragraph or list item.
  - Why: Matches markdown-it line maps; Obsidian counts front matter links in backlinks (data-model section 3) and treats any schemeless destination as a vault path (6.1 row 9).
  - Reverse: `extract.ts`, `afterInline` in `md.ts`.
- **D-P01-12** · confidence: med
  - Question: Search ranking and snippet.
  - Did: Every query word must occur in path or text (AND). Score per word: title 100, path 10, text occurrences up to 20; plus 1000 if the whole query is in the title and 1000 more for an exact title. Ties sort by path. Snippet is about 120 characters around the earliest match, whitespace collapsed, with `…` at cut ends; path-only matches show the start of the text. Default limit 50. No query operators yet.
  - Why: R-NAV-04 asks only for title matches first; Obsidian's operator syntax (data-model section 9) is beyond the MVP.
  - Reverse: `search` in `quire/packages/core/src/search.ts`.
- **D-P01-13** · confidence: high
  - Question: Empty or invalid front matter.
  - Did: `---\n---` gives `data: {}`, `raw: ''`. Invalid YAML or a non-map keeps `raw` and still excludes the block from the body, with `data: null`. CRLF fences are accepted; the closing fence is a line that is exactly `---` (trailing spaces allowed). YAML 1.2 core schema, so dates stay strings.
  - Why: data-model 6.1 row 1; Obsidian still hides an invalid properties block from the reading view.
  - Reverse: `splitFrontmatter` in `quire/packages/core/src/markdown/frontmatter.ts`.
