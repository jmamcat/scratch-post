// One CSS file per theme, each scoped to :root[data-quire-theme='<id>'] (R-PLT-05). They set the
// variables styles.css and live-preview-headings.css read; no theme restyles components itself.
import './live-preview-headings.css';
import './default.css';
import './minimal.css';
import './things.css';
import './paper.css';
import './atlas.css';

export interface Theme {
  id: string;
  name: string;
  /** What it borrows from, in a few words; shown in Settings. */
  inspiredBy: string;
}

export const THEMES: Theme[] = [
  { id: 'default', name: 'Default', inspiredBy: "Obsidian's default theme" },
  { id: 'minimal', name: 'Minimal', inspiredBy: 'the Minimal community theme' },
  { id: 'things', name: 'Things', inspiredBy: 'the Things community theme' },
  { id: 'paper', name: 'Paper', inspiredBy: "Notion's page typography" },
  { id: 'atlas', name: 'Atlas', inspiredBy: 'Confluence and Atlassian' },
];

const KEY = 'quire.theme';

export function loadTheme(): string {
  try {
    const id = localStorage.getItem(KEY);
    return THEMES.some((t) => t.id === id) ? id! : 'default';
  } catch {
    return 'default';
  }
}

/** Applies a theme to the page and remembers it on this device (R-PLT-05). */
export function applyTheme(id: string): void {
  document.documentElement.dataset['quireTheme'] = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // private mode: the theme still applies for this session
  }
}
