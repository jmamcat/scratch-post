import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { WORKER_SOURCE } from './worker.ts';

/** Colours of the default theme (styles.css `--bg`), for the browser chrome of an installed app. */
const THEME_LIGHT = '#ffffff';
const THEME_DARK = '#1e1e21';

/**
 * R-PLT-06 build plugin: after the bundle is known, write `sw.js` (the hand-written worker
 * with the list of files to precache and a build id) and `manifest.webmanifest`, and link the
 * manifest from `index.html`. Production builds only; the dev server never has a worker.
 */
export function offlinePlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'quire-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(c) {
      config = c;
    },
    transformIndexHtml() {
      const base = config.base;
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: `${base}manifest.webmanifest` }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'theme-color', content: THEME_LIGHT, media: '(prefers-color-scheme: light)' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'theme-color', content: THEME_DARK, media: '(prefers-color-scheme: dark)' }, injectTo: 'head' },
      ];
    },
    generateBundle(_options, bundle) {
      const hash = createHash('sha256');
      const files = new Map<string, string | Uint8Array>();
      for (const [name, item] of Object.entries(bundle)) {
        files.set(name, item.type === 'chunk' ? item.code : item.source);
      }
      if (config.publicDir && config.build.copyPublicDir && existsSync(config.publicDir)) {
        for (const abs of walk(config.publicDir)) {
          const name = relative(config.publicDir, abs).split(sep).join('/');
          if (!files.has(name)) files.set(name, readFileSync(abs));
        }
      }
      files.delete('sw.js');
      files.delete('manifest.webmanifest');
      const names = [...files.keys()].sort();
      for (const name of names) hash.update(name).update('\0').update(files.get(name)!).update('\0');
      const build = hash.digest('hex').slice(0, 16);
      const source = WORKER_SOURCE.replace('__BUILD__', () => JSON.stringify(build)).replace('__FILES__', () => JSON.stringify(names));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(
          {
            name: 'Quire',
            short_name: 'Quire',
            description: 'A lean Markdown store and renderer',
            start_url: config.base,
            scope: config.base,
            display: 'standalone',
            background_color: THEME_LIGHT,
            theme_color: THEME_LIGHT,
            icons: [{ src: `${config.base}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
          },
          null,
          2,
        ),
      });
    },
  };
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) yield* walk(abs);
    else yield abs;
  }
}
