import { loadPref } from '../../shared/use-pref.ts';

export const TEMPLATE_FOLDER_PREF = 'templateFolder';
export const DEFAULT_TEMPLATE_FOLDER = 'templates/';

/** The templates folder setting as a prefix: no leading slash, one trailing slash, "" for the vault root (R-VLT-13). */
export function templateFolder(): string {
  const raw = loadPref<string>(TEMPLATE_FOLDER_PREF, DEFAULT_TEMPLATE_FOLDER);
  const clean = (typeof raw === 'string' ? raw : DEFAULT_TEMPLATE_FOLDER).trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return clean === '' ? '' : `${clean}/`;
}

/** Notes under the templates folder, sorted by path. */
export function templatePaths(paths: readonly string[], folder = templateFolder()): string[] {
  return paths.filter((p) => p.startsWith(folder) && p.toLowerCase().endsWith('.md')).sort();
}
