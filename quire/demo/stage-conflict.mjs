#!/usr/bin/env node
// Stages a collision on the running demo's cloud server: two devices, "phone" and
// "laptop", edit the same line of Projects/Alpha.md from the same starting revision, the
// way two offline devices would. The second edit lands in the review inbox.
const base = process.env.QUIRE_URL ?? `http://127.0.0.1:${process.env.QUIRE_DEMO_PORT ?? 8787}`;
const path = 'Projects/Alpha.md';

async function call(method, route, body) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${await res.text()}`);
  return res.json();
}

const { meta, text } = await call('GET', `/api/doc?path=${encodeURIComponent(path)}`);
const line = '- Keep it lean';
if (!text.includes(line)) throw new Error(`expected "${line}" in ${path}; restart the demo for fresh seed data`);

const push = (device, replacement) =>
  call('POST', '/api/sync/push', { device, items: [{ path, baseRev: meta.rev, text: text.replace(line, replacement) }] });

await push('phone', '- Keep it lean: under 2,000 lines');
const [result] = await push('laptop', '- Keep it lean: no plugins in v1');
console.log(
  result.status === 'conflict'
    ? `Staged: "${path}" now has an open review item (phone vs laptop). Look for the badge in the status bar.`
    : `Unexpected result: ${result.status}`,
);
