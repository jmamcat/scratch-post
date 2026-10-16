# Using Claude Code cloud credits

Notes researched 2026-10-16 from Anthropic docs. Check https://claude.ai/settings/usage for the real balance and unit.

## What the credit is

No Anthropic page mentions a "200 credit" offer. The official promotion is a one-time
"Cloud sessions bonus credit" ($100 on Pro, $250 on Max), which adds free usage on top of plan limits.
([Help Center](https://support.claude.com/en/articles/17152539-cloud-sessions-bonus-credit-promotion))

- Covers cloud sessions started from web, desktop, CLI or mobile. Applied automatically.
- Does not cover Projects, Routines, Remote Control sessions, Chat/Cowork, or local Claude Code.
- While a balance remains, cloud usage does not count against plan limits. Afterwards it does.
- The cloud VM has no separate charge. No per-minute or per-token rate is published for the credit.
- Parallel cloud sessions use limits proportionately faster.
  ([docs](https://code.claude.com/docs/en/claude-code-on-the-web#limitations))

## Deadlines

- Claim deadline: October 7, 2026, 11:59 PM PT (already passed).
- Expiry: **November 4, 2026, 11:59 PM PT**. Unused credit is lost.
- One per account. Switching plans resets it to the new plan's amount minus what was used.

## Getting the most out of it

1. Spend it before Nov 4, on cloud sessions only (Routines and Projects don't draw from it).
2. Default to Sonnet (`/model sonnet`) and a lower `/effort`. Save Opus for hard problems.
   ([costs](https://code.claude.com/docs/en/costs#choose-the-right-model))
3. Plan locally in plan mode, then send one specific, scoped task per cloud session.
   ([tips](https://code.claude.com/docs/en/claude-code-on-the-web#tips-for-cloud-tasks))
4. Put tool installs in the environment setup script (cached if it finishes in about 5 minutes).
   Use a SessionStart hook for per-repo dependency installs.
   ([caching](https://code.claude.com/docs/en/cloud-environments#environment-caching))
5. Avoid background churn: `/loop` runs and check-ins resend full context each turn.
   ([why usage climbs](https://code.claude.com/docs/en/costs#why-usage-climbs-in-a-long-session))
6. `/compact` long sessions. `/clear` isn't available in the cloud, so start a new session instead.
7. Run independent tasks as parallel sessions when the deadline is close, since each burns credit at its own rate.

Good uses for a fixed pot like this: chunky, well-defined jobs (test-suite backfills, migrations,
dependency upgrades, refactors across many files) where you'd otherwise hit plan limits.
