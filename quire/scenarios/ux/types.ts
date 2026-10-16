// Types of the UX scorer (playbook/modules/ux). A state is one screen at one viewport, in one
// theme and colour scheme; it gets a 0-100 total from seven weighted categories.
import type { Page } from '@playwright/test';

export type CategoryId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Scheme = 'light' | 'dark';

export const CATEGORIES: Record<CategoryId, { name: string; weight: number }> = {
  A: { name: 'Accessibility conformance', weight: 30 },
  B: { name: 'Contrast', weight: 15 },
  C: { name: 'Text and typography', weight: 15 },
  D: { name: 'Interaction', weight: 15 },
  E: { name: 'Structure', weight: 10 },
  F: { name: 'Stability and responsiveness', weight: 10 },
  G: { name: 'Consistency and density', weight: 5 },
};
export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export interface StateKey {
  screen: string;
  viewport: string;
  theme: string;
  scheme: Scheme;
}

/** One measured metric. `score` is null when nothing was measured or the metric is report-only. */
export interface Metric {
  raw: number | string | null;
  score: number | null;
  /** How many things were measured (characters, elements, rules, runs). */
  n: number;
  weight: number;
  /** Counted in the category score but never gated on its own (APCA, 44 px targets). */
  advisory?: boolean;
  /** Shown in the report, never scored. */
  reportOnly?: boolean;
}

export interface CategoryScore {
  /** 0-100; null when no metric in the category applied. */
  score: number | null;
  metrics: Record<string, Metric>;
}

export type HardCheckId = 'axe-serious' | 'contrast' | 'reflow' | 'focus-visible' | 'text-spacing';
export const HARD_CHECKS: Record<HardCheckId, string> = {
  'axe-serious': 'no critical or serious axe violations',
  contrast: 'WCAG 2.x text contrast at 100%',
  reflow: 'no horizontal scrolling at 320 px',
  'focus-visible': 'every element reached by Tab shows a visible focus change',
  'text-spacing': 'no text clipped under the WCAG 1.4.12 overrides',
};

/** null: not measured in this state (reflow is measured on the narrow viewport only). */
export type HardCheck = { pass: boolean; detail: string } | null;

/** A failure a person can act on. The key (rule plus selector hash) is what the ratchet compares. */
export interface Violation {
  key: string;
  rule: string;
  category: CategoryId;
  impact: string;
  selector: string;
  message: string;
}

export interface StateScore {
  id: string;
  key: StateKey;
  total: number;
  categories: Record<CategoryId, CategoryScore>;
  hard: Record<HardCheckId, HardCheck>;
  violations: Violation[];
  /** Counts shown in the report only (axe incomplete nodes, edge density, Flesch of user content). */
  reported: Record<string, number | string>;
}

export interface Engines {
  axe: string;
  colorjs: string;
  playwright: string;
  chromium: string;
}

export interface Baseline {
  schema: 1;
  engines: Engines;
  states: Record<string, { total: number; categories: Partial<Record<CategoryId, { score: number | null; metrics: Record<string, { raw: number | string | null; score: number | null; n: number }>; passing?: number }>>; violations: string[] }>;
}

/** What the scorer needs to know about the app under test; one per project. */
export interface UxApp {
  themes: readonly string[];
  schemes: readonly Scheme[];
  viewports: readonly Viewport[];
  /** Viewport (by name) whose states also run the 320 px reflow check. */
  reflowFrom: string;
  screens: readonly Screen[];
  /**
   * Selectors of content the person wrote (rendered notes, the editor, note names). Plain
   * language is not scored there and its Flesch score is only reported.
   */
  userContent: readonly string[];
  /** Selectors of the rendered document, where line length and line height are measured. */
  prose: readonly string[];
  /** Selectors of primary actions, reported against the 44 px advisory target size. */
  primaryActions: readonly string[];
  /** Widgets that keep Tab (code editors), with the key that lets focus leave them. */
  tabEscapes: readonly { selector: string; key: string }[];
  /** Puts the page into a theme and colour scheme for the next screen. */
  applyTheme(page: Page, theme: string, scheme: Scheme): Promise<void>;
}

export interface Screen {
  id: string;
  label: string;
  /** Opens the screen from any state and resolves once the app reports it is ready. False: the screen does not exist in this build. */
  open(page: Page, viewport: Viewport): Promise<boolean>;
}
