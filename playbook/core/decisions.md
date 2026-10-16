# Decisions and run reports

Agents running a play never stop to ask a question. They decide, record the decision so a
person can reverse it cheaply, and keep going. At the end, the decisions worth a human's
attention are collated into one report.

## Deciding without asking

When something is ambiguous, decide in this order:

1. What the specs say (requirements and scenarios).
2. What the project's existing code and conventions do.
3. What the `baseline` reference does, then a `primary` reference for that domain
   (references module only).
4. The simplest option that is easy to reverse.

Stop and mark the packet `blocked` only for:

- destructive actions outside the packet's owned paths (deleting data, rewriting history,
  dropping tables, force pushes),
- secrets, credentials, payments, new accounts, anything outward-facing (publishing,
  sending messages),
- license problems (copying code from a reference whose license forbids it).

A blocked packet never stops the run; work on any other ready packet.

## Decision record

Append to the packet's "Decisions log":

```markdown
- **D-<packet>-<n>** · confidence: high | med | low
  - Question: what was unclear
  - Did: what was chosen
  - Why: the spec line, convention, reference ID or reasoning
  - Reverse: what to change if wrong, and where
```

Write one for every call a reasonable reviewer might make differently. Do not write one for
choices the spec or conventions already settle.

## Run report

The coordinator copies `templates/run-report.md` to `changes/<id>/run-report.md`:

- **"I have some questions, but I proceeded with these recommendations; kindly direct me if
  any were incorrect."** Every `med` and `low` decision, as a table: question, what was done,
  why, confidence, how to reverse.
- High-confidence decisions: one line each.
- Blocked or skipped work and what would unblock it.
- Verification evidence: commands and counts.
- Spec drift: where the build and the spec disagree and which one should change.
- Playbook friction: anything in the playbook that cost time. Candidates for amendments.

A person's reply to a run report becomes the next change, or a follow-up packet in the
same change if it is not archived yet.
