import { writeFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { appDevice } from '../support/app.ts';
import { SystemDevice } from '../support/system-device.ts';
import { Given, Then } from '../support/world.ts';
import { gateFailures, judge, readBaseline } from '../ux/gate.ts';
import { demoNotes, offeredThemes, quireApp } from '../ux/quire.ts';
import { renderReport } from '../ux/report.ts';
import { prepareContext, scoreApp } from '../ux/score.ts';

// R-PLT-08: the UX scorer (scenarios/ux, playbook/modules/ux) over every theme, light and dark,
// on the standard screens, judged like `pnpm -C quire ux` plus the hard checks and floors.

Given('device {string} with the demo notes', async ({ world }, name: string) => {
  const seeder = new SystemDevice('demo-seed', world.requireCloud().url, world.token);
  for (const [path, text] of demoNotes()) await seeder.setText(path, text);
  await seeder.sync();
  await seeder.close();
  await world.addDevice(name);
});

Then('in every theme the standard screens on {string} pass the UX gate', async ({ world, $testInfo }, d: string) => {
  // Kept inside the everyday scenarios gate: every theme, light and dark, at the desktop
  // viewport; the phone viewport and the 320 px reflow check in the default theme only; one CLS
  // sample. `pnpm -C quire ux` runs the full matrix with three CLS samples.
  $testInfo.setTimeout(8 * 60_000);
  const { page } = appDevice(world, d);
  expect(await offeredThemes(page), 'the scorer covers every theme the app offers').toEqual([...quireApp.themes]);
  await prepareContext(page);
  const run = { settleMs: 300 };
  const desktop = await scoreApp(page, quireApp, { ...run, viewports: ['1280x800'] });
  const phone = await scoreApp(page, quireApp, { ...run, viewports: ['390x844'], themes: ['default'] });
  const score = { states: [...desktop.states, ...phone.states], missing: [...new Set([...desktop.missing, ...phone.missing])], engines: desktop.engines };
  const verdict = judge(score, readBaseline());
  const report = $testInfo.outputPath('ux-report.md');
  writeFileSync(report, renderReport(score, verdict));
  const failures = gateFailures(verdict);
  expect(failures, `UX gate (report: ${report}):\n${failures.slice(0, 40).join('\n')}`).toEqual([]);
});
