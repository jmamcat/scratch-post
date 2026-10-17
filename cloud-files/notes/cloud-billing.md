# Cloud session billing

What a cloud session costs once the promotional credit is gone. Recorded 2026-10-17 from
inside a session and from published coverage of the promotion. Anthropic's support article
wins where this differs.

## The promotional credit

- A one-time dollar balance for Claude Code cloud sessions only: $250 on Max, $100 on Pro.
  Claim deadline 2026-10-07; most reports give 2026-11-04 as the expiry.
- Cloud sessions spend it first, metered per use. Plan usage takes over when it runs out.
- A session cannot see the credit balance. Check claude.ai settings, Usage or Billing.

## After the credit

- Sessions count against the subscription's 5-hour and weekly limits, like any other use.
- Nothing is billed on top of the monthly fee unless **extra usage** is turned on in
  claude.ai settings and a limit is hit. With it off, hitting a limit pauses work until the
  window resets. With it on, set a spending cap.

## Checking from inside a session

The `get_session` tool (claude-code-remote MCP server) reports:

| Field | Meaning |
| --- | --- |
| `rate_limit_info.isUsingOverage` | `true` only when the session is spending extra usage (billed) |
| `rate_limit_info.rateLimitType`, `status`, `resetsAt` | Which plan window applies, whether it still allows work, when it resets (Unix seconds) |
| `usage.cost_usd` | The session's usage priced at API rates. An estimate, not a charge |

None of these fields show the promotional credit balance.

## Sources

- [Claude Code promotion (Anthropic support)](https://support.claude.com/en/articles/12690958-claude-code-promotion)
- [BleepingComputer](https://bleepingcomputer.com/news/artificial-intelligence/anthropic-rolls-out-up-to-250-in-free-claude-code-credits-but-only-for-cloud-sessions)
- [IT-Connect](https://www.it-connect.tech/claude-code-anthropic-offers-up-to-250-in-credit-for-cloud-sessions-only/)
