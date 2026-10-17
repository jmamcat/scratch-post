# Module: scenarios

Verification at the system's real boundary, written as the scenarios in the specs and
executed exactly as written. This replaces a unit-test gate.

## Why not unit tests

Agents produce code fast and refactor it freely. Tests pinned to internals break on every
refactor, get "fixed" by the same agent that broke the code, and still miss features that
are broken end to end. Agents verified at the boundary, the way a user or real client
experiences the system, do markedly better (see `sources.md`: Anthropic on long-running
agent harnesses, martinfowler.com on harness engineering, Simon Willison on conformance
suites). The test shape is the testing trophy: mostly integration, at the boundary.

## The pattern

1. **Specs are the single source.** Scenarios live in `specs/<capability>/spec.md` (and change
   deltas) as `#### Scenario:` blocks with GIVEN/WHEN/THEN bullets.
2. **Generate Gherkin.** `bin/spec-scenarios.py` turns every scenario into a `.feature`
   file, tagged with its requirement and capability. Generated files are build output
   (gitignored), regenerated before every run.
3. **One step vocabulary.** The project keeps `<specs>/STEPS.md`: the phrases scenarios may
   use. Step definitions implement each phrase once. An unknown phrase fails the run, which
   tells the author to use the vocabulary or add a step.
4. **Two layers, one suite**, chosen by tag:

   | Tag | Drives | Use for | Share |
   | --- | --- | --- | --- |
   | `@system` (default) | the real server over its real protocol, with real client instances as "devices" (their own local stores, their own network state) | data, sync, storage, protocol, permissions, failure modes | most scenarios; seconds to run |
   | `@ui` | the real app in a browser, one browser context per device, role-based locators | what a person sees and does: rendering, navigation, review screens, offline indicators | the scenarios whose value is the interaction |

   Step definitions call a thin **driver** per actor kind, so a scenario can move between
   layers without being rewritten.
5. **Simulation scenarios** for concurrency: a seeded run of many random operations across
   devices and failures, then checks of the guarantees (convergence, nothing lost). Every
   failure replays from its seed. Assert that the run actually exercised collisions.
6. **Approved outputs** for wide, rule-heavy surfaces (rendering, serialisation, reports): a
   folder of inputs and approved outputs, compared by a scenario; intentional changes are
   re-approved with one command and show up in review as diffs.

## Below the boundary

Allowed only where a boundary scenario cannot reach a risk cheaply, and only as property or
model-based checks of invariants (fast-check, Hypothesis, rapid), never as example tests of
internals. Agents may write throwaway tests as scaffolding while working; they are deleted
before the packet is done.

## Runners by language

The generated Gherkin is the portable part.

| Language | Runner | Browser layer |
| --- | --- | --- |
| TypeScript / JavaScript | playwright-bdd on Playwright Test | Playwright (multiple contexts, `setOffline`) |
| Python | pytest-bdd or behave | Playwright for Python |
| Go | godog | Playwright for Go or chromedp |
| .NET | Reqnroll | Playwright for .NET |
| JVM | Cucumber-JVM | Playwright for Java |

AI-native browser tools (Playwright agents and MCP, Stagehand, Midscene) are useful while
writing step definitions and exploring the app. They are not the gate: the gate must be
deterministic and must not need a model at test time.

## Rules

- A scenario is changed only by changing the spec. Never edit generated `.feature` files.
- Never delete, skip or weaken a scenario to make a run pass (see `core/verification.md`).
- Every requirement has at least one scenario; `bin/spec-scenarios.py --check` reports
  requirements without one.
- Steps assert observable outcomes (what a user sees, what a client receives, what is on
  disk), never internal state.
- Every indicator a person relies on to know the state of their data (sync status, pending
  marks, conflict counts, offline banners) has at least one `@ui` scenario that reads it
  from the screen. A `@system` driver that reads the client's own store cannot see bugs in
  how that state reaches the screen (amendment 0001).
- Each scenario starts from a fresh system (new data directory, new ports).
- A runner that builds the system under test (a web bundle, an image) rebuilds when any
  of its sources is newer than the build, not only when the build is missing. Otherwise
  the scenarios pass against yesterday's code (amendment 0010).
- Mutation testing (Stryker, mutmut, go-mutesting) from time to time checks that the
  scenarios catch real bugs. Optional.
