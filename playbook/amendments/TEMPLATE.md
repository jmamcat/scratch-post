---
id: NNNN-short-slug
status: proposed | accepted | rejected | reverted
proposed_by: <harness/model or person>
date: YYYY-MM-DD
evidence: counterexample | replay | trend
affects: [core/..., plays/..., modules/...]
version_bump: major | minor | patch
---

# <Title>

## Problem

What went wrong or cost time, quoted from the run report, packet or transcript (with paths).

## Change

```diff
- old text
+ new text
```

## Evidence

The counterexample walk-through, or the replay/trend metrics table:

| Metric | Before | After |
| --- | --- | --- |
| first-pass verification | | |
| decision records per packet (reversed) | | |
| blocked packets | | |
| escaped defects | | |

## Guards

Confirm each: stop conditions unchanged; gates unchanged; still harness, model, language
and project agnostic; no records deleted.

## Outcome

Accepted or proposed, version bump, CHANGELOG line.
