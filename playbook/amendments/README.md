# Amendments: how the playbook changes itself

Any agent or person may change this playbook, but only with evidence that the change makes
outcomes better. Opinions, style preferences and "this feels cleaner" are not evidence.

## When to propose one

- A run report's "Playbook friction" section names the same problem twice.
- A rule forced a decision record that a reviewer later reversed.
- A play was missing for real work (the agent had to improvise a sequence of steps).
- A rule was ambiguous and two agents read it differently.

## What counts as proof

An amendment needs at least one of these, and must not fail any check in "Guards":

| Kind | Evidence | Strength |
| --- | --- | --- |
| **Counterexample** | A concrete situation (quoted from a run report, packet or transcript) where following the current text produced a wrong or wasteful result, plus a walk-through showing the amended text produces the right one. | minimum for wording and clarifications |
| **Replay** | The same packet or change run twice on the same model tier and harness, once under the current text and once under the amended text, with the metrics below recorded for both. | needed for changes to core/ or a play's steps |
| **Trend** | Metrics from at least three runs under the amended text compared with at least three before. | needed to remove a rule or a gate |

Metrics, all available from packets and run reports:

- first-pass verification rate (packets whose acceptance passed on the first try),
- decision records per packet, and how many a human reversed,
- blocked packets, and redirections in replies to run reports,
- scenarios added versus scenarios that later failed in a different change (escaped defects),
- wall-clock and token cost where the harness reports them (`usage/ledger.csv` when the
  usage module is on; `bin/usage.py report --by model` compares tiers).

An amendment is better if it improves at least one metric and worsens none beyond noise
(for replays: no metric worse by more than 10 percent).

## Guards (an amendment may not, without a human's explicit approval)

- weaken the stop conditions in `core/decisions.md` (destructive actions, secrets, licenses),
- remove or weaken the verification gates in `core/verification.md`,
- make the playbook depend on a specific harness, model, language or project,
- delete an amendment record.

## Process

1. Copy `TEMPLATE.md` to `log/NNNN-short-slug.md`.
2. Fill in the problem, the exact text change (a diff), the evidence, and which plays and
   modules are affected.
3. If the evidence meets the bar and no guard applies, apply the change in the same commit,
   set `status: accepted`, bump `VERSION` (major: the loop or a gate changes; minor: a new play,
   module or rule; patch: wording) and add a line to `CHANGELOG.md`.
4. Otherwise set `status: proposed` and list it in the run report for a person to decide.
5. A person may revert any accepted amendment by setting `status: reverted` with a reason; the
   record stays.
