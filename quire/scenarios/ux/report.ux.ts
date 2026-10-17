// Collects the states the score tests wrote, writes report.md, and checks the ratchet against
// baseline.json; with QUIRE_UX_APPROVE=1 it writes the baseline instead (`pnpm -C quire ux:approve`).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { gateFailures, judge, readBaseline, REPORT_PATH, writeBaseline } from './gate.ts';
import { quireApp } from './quire.ts';
import { enginesLine, renderReport, summaryTable } from './report.ts';
import type { AppScore } from './score.ts';

test('report', async () => {
  const out = process.env['QUIRE_UX_OUT']!;
  const parts = readdirSync(out)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(out, f), 'utf8')) as AppScore);
  expect(parts.length, 'score tests wrote their states').toBeGreaterThan(0);
  const order = (list: readonly { id: string }[] | readonly string[], x: string) => list.findIndex((e) => (typeof e === 'string' ? e : e.id) === x);
  const states = parts
    .flatMap((p) => p.states)
    .sort(
      (a, b) =>
        order(quireApp.screens, a.key.screen) - order(quireApp.screens, b.key.screen) ||
        order(quireApp.themes, a.key.theme) - order(quireApp.themes, b.key.theme) ||
        order(quireApp.schemes, a.key.scheme) - order(quireApp.schemes, b.key.scheme) ||
        order(quireApp.viewports.map((v) => v.name), a.key.viewport) - order(quireApp.viewports.map((v) => v.name), b.key.viewport),
    );
  const score: AppScore = { states, missing: [...new Set(parts.flatMap((p) => p.missing))], engines: parts[0]!.engines };

  const approve = process.env['QUIRE_UX_APPROVE'] === '1';
  const narrowed = ['QUIRE_UX_THEMES', 'QUIRE_UX_SCHEMES', 'QUIRE_UX_SCREENS'].filter((k) => process.env[k]);
  if (approve && narrowed.length) throw new Error(`refusing to approve a narrowed run (${narrowed.join(', ')}): the baseline must cover every state`);
  const verdict = judge(score, readBaseline());
  writeFileSync(REPORT_PATH, renderReport(score, verdict, { approved: approve }));
  if (approve) writeBaseline(score);

  console.log(`\n${summaryTable(score)}\n`);
  console.log(`UX engines: ${enginesLine(score, verdict)}`);
  const failures = gateFailures(verdict);
  console.log(`R-PLT-08 gate: ${failures.length ? `${failures.length} failures (see report)` : 'passes'}`);
  console.log(`Report: ${fileURLToPath(REPORT_PATH)}${approve ? ' (baseline approved)' : ''}`);
  if (!approve) expect(verdict.ratchet, 'UX ratchet against scenarios/ux/baseline.json (approve improvements with pnpm -C quire ux:approve)').toEqual([]);
});
