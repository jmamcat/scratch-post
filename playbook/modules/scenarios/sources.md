# Sources (scenarios module)

Researched 2026-10-16. Popularity numbers were read from GitHub (via shields.io) and the
npm, PyPI and NuGet download APIs on that date.

| Tool | Stars / downloads | Status | Needs a model at test time |
| --- | --- | --- | --- |
| Playwright Test | 98k / 76M per week | very active | no |
| playwright-bdd | 807 / 847k per week | v9.2.1, Sep 2026 | no |
| cucumber-js | 5.4k / 2.0M per week | v13.3.0, Oct 2026 | no |
| pytest-bdd, behave | 1.5k / 795k, 3.5k / 880k per week | active | no |
| Reqnroll (.NET; SpecFlow ended Dec 2024) | 790 / 28.9M total | active | no |
| Gauge (Markdown specs) | 3.2k | community maintained since 2021 | no |
| Cypress | 51k / 5.9M per week | active; one browser context per test | no |
| fast-check (model-based) | 5.2k / 70M per week | v4.10, Sep 2026 | no |
| Playwright agents and MCP | 38k / 6.4M per week | since Playwright 1.56 | only while authoring |
| Stagehand | 26k / 1.6M per week | v4.2 | yes (cache misses) |
| Midscene | 15k / 66k per week | beta test framework | yes |
| Magnitude, Shortest | 6.9k, 5.7k | slowing, stale | yes |

Writing:

- Anthropic, effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Harness engineering: https://martinfowler.com/articles/harness-engineering.html
- Are harnesses worth the cost: https://martinfowler.com/articles/are-harnesses-worth-the-cost.html
- Spec-driven development tools: https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
- Thoughtworks radar, spec-driven development: https://www.thoughtworks.com/radar/techniques/spec-driven-development
- OpenAI harness engineering (InfoQ): https://www.infoq.com/news/2026/02/openai-harness-engineering-codex
- Kent Beck, augmented coding: https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes
- Simon Willison, conformance suites: https://simonwillison.net/tags/conformance-suites/
- Kent C. Dodds, write tests and the testing trophy: https://kentcdodds.com/blog/write-tests and https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications
- Playwright test agents: https://playwright.dev/docs/test-agents
- playwright-bdd: https://vitalets.github.io/playwright-bdd/
- cucumber-js configuration (Markdown features): https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md
- Gauge: https://github.com/getgauge/gauge
- SpecFlow end of life: https://reqnroll.net/news/2025/01/specflow-end-of-life-has-been-announced/
- Stagehand caching: https://docs.stagehand.dev/v4/best-practices/caching
- Midscene caching: https://midscenejs.com/caching
- fast-check model-based testing: https://fast-check.dev/docs/advanced/model-based-testing/
- TigerBeetle VOPR: https://docs.tigerbeetle.com/about/vopr
- Deterministic simulation testing: https://antithesis.com/resources/deterministic_simulation_testing/

Why generated Gherkin rather than Markdown features: only cucumber-js parses `.feature.md`;
playwright-bdd 9.2.1 and the Python, Go, .NET and JVM runners take plain Gherkin, so
generating it keeps the module language-agnostic while specs stay in Markdown.
