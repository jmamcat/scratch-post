import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, resolveLink } from '@quire/core';
import { expect } from '@playwright/test';
import { Then } from '../support/world.ts';

const gallery = fileURLToPath(new URL('../approved/render', import.meta.url));

function notes(dir = gallery): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return notes(full);
    return name.endsWith('.md') ? [relative(gallery, full)] : [];
  });
}

/**
 * Approved outputs (R-RND-00): each gallery note is rendered the way the app renders it,
 * with links resolved against the gallery itself, and compared with its approved .html.
 * QUIRE_APPROVE=1 writes the current output as the new approved version.
 */
Then('every note in the rendering gallery renders as approved', async () => {
  const paths = notes();
  const mismatches: string[] = [];
  for (const path of paths) {
    const html = renderMarkdown(readFileSync(join(gallery, path), 'utf8'), {
      resolve: (target) => resolveLink(target, path, paths),
    });
    const approved = join(gallery, path.replace(/\.md$/, '.approved.html'));
    if (process.env.QUIRE_APPROVE === '1') writeFileSync(approved, html);
    else if (!existsSync(approved)) mismatches.push(`${path}: no approved output (run pnpm -C quire scenarios:approve)`);
    else if (readFileSync(approved, 'utf8') !== html) {
      writeFileSync(approved.replace('.approved.html', '.received.html'), html);
      mismatches.push(`${path}: differs from approved (see the .received.html next to it)`);
    }
  }
  expect(mismatches).toEqual([]);
});
