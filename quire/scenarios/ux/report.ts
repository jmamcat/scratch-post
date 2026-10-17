// The Markdown report: the evidence a change pastes (playbook/modules/ux, "Evidence").
import { FLOOR_CATEGORY, FLOOR_TOTAL, MAX_CATEGORY_DROP, MAX_TOTAL_DROP, type Verdict } from './gate.ts';
import { round } from './metrics.ts';
import type { AppScore } from './score.ts';
import { CATEGORIES, CATEGORY_IDS, HARD_CHECKS, type HardCheckId, type StateScore } from './types.ts';

const mean = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length, 1) : NaN);
const lowest = (states: StateScore[]) => states.reduce((a, b) => (b.total < a.total ? b : a));
const short = (s: StateScore) => `${s.key.viewport} ${s.key.scheme}`;

/** Per screen and theme totals (mean over schemes and viewports) and the lowest state per screen. */
export function summaryTable(score: AppScore): string {
  const themes = [...new Set(score.states.map((s) => s.key.theme))];
  const screens = [...new Set(score.states.map((s) => s.key.screen))];
  const rows = [`| Screen | ${themes.join(' | ')} | Lowest state |`, `| --- | ${themes.map(() => '---:').join(' | ')} | --- |`];
  for (const screen of screens) {
    const of = score.states.filter((s) => s.key.screen === screen);
    const low = lowest(of);
    rows.push(`| ${screen} | ${themes.map((t) => mean(of.filter((s) => s.key.theme === t).map((s) => s.total))).join(' | ')} | ${low.total} (${low.key.theme} ${short(low)}) |`);
  }
  const low = lowest(score.states);
  rows.push(`| **all** | ${themes.map((t) => `**${mean(score.states.filter((s) => s.key.theme === t).map((s) => s.total))}**`).join(' | ')} | **${low.total}** (${low.key.screen} ${low.key.theme} ${short(low)}) |`);
  return rows.join('\n');
}

function hardTable(score: AppScore): string {
  const rows = ['| Hard check | States passing | Failing (first three) |', '| --- | ---: | --- |'];
  for (const id of Object.keys(HARD_CHECKS) as HardCheckId[]) {
    const measured = score.states.filter((s) => s.hard[id]);
    const failing = measured.filter((s) => !s.hard[id]!.pass);
    rows.push(`| ${HARD_CHECKS[id]} | ${measured.length - failing.length} / ${measured.length} | ${failing.slice(0, 3).map((s) => `${s.id}: ${s.hard[id]!.detail}`).join('<br>') || '-'} |`);
  }
  return rows.join('\n');
}

function categoryTable(score: AppScore): string {
  const rows = ['| Category (weight) | Mean | Lowest | Lowest state |', '| --- | ---: | ---: | --- |'];
  for (const id of CATEGORY_IDS) {
    const scored = score.states.filter((s) => s.categories[id].score !== null);
    if (!scored.length) {
      rows.push(`| ${id} ${CATEGORIES[id].name} (${CATEGORIES[id].weight}) | - | - | - |`);
      continue;
    }
    const low = scored.reduce((a, b) => (b.categories[id].score! < a.categories[id].score! ? b : a));
    rows.push(`| ${id} ${CATEGORIES[id].name} (${CATEGORIES[id].weight}) | ${mean(scored.map((s) => s.categories[id].score!))} | ${low.categories[id].score} | ${low.id} |`);
  }
  return rows.join('\n');
}

function metricLines(s: StateScore): string {
  const out: string[] = [];
  for (const id of CATEGORY_IDS) {
    const c = s.categories[id];
    // Axe rules (A, E) list only the failing ones; the rest are counted.
    const rules = id === 'A' || id === 'E';
    const shown = Object.entries(c.metrics).filter(([, m]) => !rules || m.score !== 1);
    const passing = Object.keys(c.metrics).length - shown.length;
    const parts = shown.map(([k, m]) => `${k} ${m.raw ?? '-'}${m.score === null ? '' : ` → ${round(m.score * 100, 0)}`}${m.advisory ? ' (advisory)' : ''}`);
    if (passing) parts.push(`${passing} more rules pass`);
    out.push(`- **${id}** ${c.score ?? 'n/a'}: ${parts.join('; ') || 'nothing to measure'}`);
  }
  const reported = Object.entries(s.reported).map(([k, v]) => `${k} ${v}`);
  if (reported.length) out.push(`- reported: ${reported.join('; ')}`);
  return out.join('\n');
}

/** One line for logs: the engines, and whether the ratchet was gated against the baseline. */
export function enginesLine(score: AppScore, v: Verdict): string {
  const e = score.engines;
  const engines = `axe ${e.axe}, Color.js ${e.colorjs}, Playwright ${e.playwright}, Chromium ${e.chromium}, fonts ${e.fonts}`;
  return v.enginesChanged.length ? `${engines}; differ from the baseline (${v.enginesChanged.join('; ')}): ratchet not gated` : `${engines}; ratchet gated`;
}

export function renderReport(score: AppScore, v: Verdict, opts: { approved?: boolean } = {}): string {
  const states = score.states;
  const all = mean(states.map((s) => s.total));
  const low = lowest(states);
  const contrastOk = states.filter((s) => s.hard.contrast?.pass).length;
  const lines: string[] = [];
  lines.push('# UX report', '');
  lines.push(`Generated ${new Date().toISOString()} by \`pnpm -C quire ux\`. Engines: axe ${score.engines.axe}, Color.js ${score.engines.colorjs}, Playwright ${score.engines.playwright}, Chromium ${score.engines.chromium}. Fonts: ${score.engines.fonts}.`);
  lines.push(`${states.length} states. App total **${all}**, lowest state **${low.total}** (${low.id}). WCAG contrast at 100% in ${contrastOk} of ${states.length} states.`);
  if (score.missing.length) lines.push(`Screens not in this build: ${score.missing.join(', ')}.`);
  lines.push('');
  const r08 = v.hard.length + v.floors.length + v.ratchet.length === 0;
  lines.push(`**Gate:** hard checks ${v.hard.length ? `fail in ${new Set(v.hard.map((h) => h.state)).size} states` : 'pass'}; floors (${FLOOR_TOTAL} per state, ${FLOOR_CATEGORY} per category) ${v.floors.length ? `fail ${v.floors.length} times` : 'pass'}; ratchet ${opts.approved ? 'approved as the new baseline' : v.ratchet.length ? 'FAILS' : 'passes'}. R-PLT-08 ${r08 ? 'passes' : 'fails'}.`);
  if (v.enginesChanged.length) lines.push(`Engines differ from the baseline (${v.enginesChanged.join(', ')}): deltas are shown but not gated; re-baseline in a separate commit.`);
  lines.push('', '## Summary', '', 'State totals, mean over light and dark and both viewports.', '', summaryTable(score), '');
  lines.push('## Hard checks', '', hardTable(score), '');
  lines.push('## Categories', '', categoryTable(score), '');
  if (v.floors.length) {
    lines.push('## Under the floors', '', '| State | What | Score |', '| --- | --- | ---: |');
    for (const f of v.floors.slice(0, 60)) lines.push(`| ${f.state} | ${f.what === 'total' ? 'total' : `${f.what} ${CATEGORIES[f.what].name}`} | ${f.value} |`);
    if (v.floors.length > 60) lines.push(`| … ${v.floors.length - 60} more | | |`);
    lines.push('');
  }
  lines.push('## Against the baseline', '');
  lines.push(`The ratchet fails when a state total drops more than ${MAX_TOTAL_DROP}, a category more than ${MAX_CATEGORY_DROP}, or a new violation appears.`, '');
  for (const r of v.ratchet) lines.push(`- ${r}`);
  if (v.ratchet.length) lines.push('');
  const moved = v.deltas.filter((d) => Math.abs(d.before - d.after) >= 0.01);
  if (moved.length) {
    lines.push('| State | Before | After | Points lost by category |', '| --- | ---: | ---: | --- |');
    for (const d of moved.slice(0, 40)) {
      const by = Object.entries(d.lost).sort((a, b) => b[1] - a[1]).map(([c, p]) => `${c} ${p > 0 ? '-' : '+'}${Math.abs(p)}`);
      lines.push(`| ${d.state} | ${d.before} | ${d.after} | ${by.join(', ')} |`);
    }
    lines.push('');
  } else lines.push('No state total moved.', '');
  if (v.unbaselined.length) lines.push(`States with no baseline yet (${v.unbaselined.length}): ${v.unbaselined.slice(0, 12).join(', ')}${v.unbaselined.length > 12 ? ', …' : ''}.`, '');
  if (v.gone.length) lines.push(`Baseline states not scored now (${v.gone.length}): ${v.gone.slice(0, 12).join(', ')}${v.gone.length > 12 ? ', …' : ''}.`, '');
  lines.push('### New violations', '');
  if (v.newViolations.length) {
    lines.push('| State | Rule | Impact | Selector | Message |', '| --- | --- | --- | --- | --- |');
    for (const n of v.newViolations.slice(0, 80)) lines.push(`| ${n.state} | ${n.v.rule} | ${n.v.impact} | \`${n.v.selector.replace(/\|/g, '\\|')}\` | ${n.v.message} |`);
    if (v.newViolations.length > 80) lines.push(`| … ${v.newViolations.length - 80} more | | | | |`);
  } else lines.push('None.');
  lines.push('', '### Fixed violations', '');
  lines.push(v.fixed.length ? `${v.fixed.length}: ${v.fixed.slice(0, 20).map((f) => `${f.state} ${f.key}`).join(', ')}${v.fixed.length > 20 ? ', …' : ''}` : 'None.');
  lines.push('', '## Violations by rule', '', '| Rule | Category | Impact | States | Example selector |', '| --- | --- | --- | ---: | --- |');
  const byRule = new Map<string, { category: string; impact: string; states: Set<string>; example: string }>();
  for (const s of states) {
    for (const viol of s.violations) {
      const e = byRule.get(viol.rule) ?? { category: viol.category, impact: viol.impact, states: new Set<string>(), example: viol.selector };
      e.states.add(s.id);
      byRule.set(viol.rule, e);
    }
  }
  for (const [rule, e] of [...byRule].sort((a, b) => b[1].states.size - a[1].states.size)) lines.push(`| ${rule} | ${e.category} | ${e.impact} | ${e.states.size} | \`${e.example.replace(/\|/g, '\\|')}\` |`);
  if (!byRule.size) lines.push('| none | | | | |');
  const contrast = new Map<string, Set<string>>();
  for (const s of states) {
    for (const viol of s.violations) {
      if (viol.rule !== 'color-contrast') continue;
      const k = `${s.key.theme} ${s.key.scheme}: \`${viol.selector.replace(/\|/g, '\\|')}\` ${viol.message.replace(/^[^:]*: /, '')}`;
      (contrast.get(k) ?? contrast.set(k, new Set()).get(k)!).add(s.key.screen);
    }
  }
  if (contrast.size) {
    lines.push('', '## Contrast failures', '');
    for (const [k, screens] of [...contrast].sort()) lines.push(`- ${k} (${[...screens].join(', ')})`);
  }
  lines.push('', '## Lowest states', '');
  for (const s of [...states].sort((a, b) => a.total - b.total).slice(0, 5)) lines.push(`### ${s.id}: ${s.total}`, '', metricLines(s), '');
  return `${lines.join('\n')}\n`;
}
