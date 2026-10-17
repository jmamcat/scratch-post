// C. Text and typography (weight 15), weighted by characters:
//   body-size (w 1): each character scores 1 at 16 px and up, 0 below 12 px (USWDS);
//   line-height (w 1): blocks of 2+ lines, 1.5 and up good, 1.2 and below poor (WCAG 1.4.8);
//   measure (w 1): characters per full line in blocks of 2+ lines, 45-80 good, 25 or 110 poor;
//   plain-language (w 1 each): Flesch Reading Ease (60 good, 30 poor) and mean sentence length
//     (20 good, 30 poor) of UI copy the product owns, English, 100 words or more, code left out.
// Text the person wrote (userContent) gets typography only; its Flesch score is reported.
import type { Page } from '@playwright/test';
import { syllable } from 'syllable';
import { band, category, metric, ramp, reportOnly, round } from '../metrics.ts';
import type { CategoryScore, Metric, UxApp } from '../types.ts';

interface TextStats {
  chars: number;
  sizeCredit: number;
  blocks: { chars: number; lines: number; fullLines: number; lineHeight: number }[];
  uiCopy: string[];
  userCopy: string[];
  lang: string;
}

export interface Readability {
  words: number;
  sentences: number;
  syllables: number;
  fre: number;
  grade: number;
  meanSentence: number;
}

/** Flesch Reading Ease and Flesch-Kincaid grade over blocks of text; each block ends a sentence. */
export function readability(blocks: string[]): Readability {
  let words = 0;
  let sentences = 0;
  let syllables = 0;
  for (const block of blocks) {
    const clean = block.replace(/https?:\/\/\S+/g, ' ').replace(/\S+@\S+\.\S+/g, ' ');
    const parts = clean.split(/(?<=[.!?…])\s+|[.!?…]+$/).filter((s) => /[A-Za-z]/.test(s));
    for (const sentence of parts) {
      const ws = sentence.match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
      if (!ws.length) continue;
      sentences++;
      words += ws.length;
      for (const w of ws) syllables += Math.max(1, syllable(w));
    }
  }
  const wps = sentences ? words / sentences : 0;
  const spw = words ? syllables / words : 0;
  return {
    words,
    sentences,
    syllables,
    fre: round(206.835 - 1.015 * wps - 84.6 * spw, 1),
    grade: round(0.39 * wps + 11.8 * spw - 15.59, 1),
    meanSentence: round(wps, 1),
  };
}

export async function scoreText(page: Page, app: UxApp): Promise<{ score: CategoryScore; reported: Record<string, number | string> }> {
  const stats: TextStats = await page.evaluate((userContent) => {
    const ux = window.__ux;
    const isBlock = (el: Element) => !/^(inline|contents)/.test(getComputedStyle(el).display) || el instanceof SVGElement;
    const blockOf = (el: Element): Element => {
      let cur: Element | null = el;
      while (cur && cur !== document.body && !isBlock(cur)) cur = cur.parentElement;
      return cur ?? document.body;
    };
    let chars = 0;
    let sizeCredit = 0;
    const byBlock = new Map<Element, Text[]>();
    for (const t of ux.textNodes()) {
      const p = t.parentElement!;
      const n = (t.nodeValue ?? '').replace(/\s+/g, ' ').trim().length;
      const px = parseFloat(getComputedStyle(p).fontSize);
      chars += n;
      sizeCredit += n * Math.min(1, Math.max(0, (px - 12) / 4));
      if (p.closest('pre, code, kbd, samp, svg')) continue;
      const b = blockOf(p);
      const list = byBlock.get(b);
      if (list) list.push(t);
      else byBlock.set(b, [t]);
    }
    const blocks: TextStats['blocks'] = [];
    const uiCopy: string[] = [];
    const userCopy: string[] = [];
    for (const [block, texts] of byBlock) {
      const text = texts.map((t) => t.nodeValue ?? '').join('').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      (ux.within(block, userContent) ? userCopy : uiCopy).push(text);
      // Lines: client rects of the block's own text, grouped by their vertical position.
      const rects: DOMRect[] = [];
      for (const t of texts) {
        const r = document.createRange();
        r.selectNodeContents(t);
        for (const rect of r.getClientRects()) if (rect.width > 0 && rect.height > 0) rects.push(rect);
      }
      const s = getComputedStyle(block);
      const fontPx = parseFloat(s.fontSize);
      const lines: { mid: number; width: number }[] = [];
      for (const rect of rects.sort((a, b) => a.top - b.top)) {
        const mid = rect.top + rect.height / 2;
        const line = lines.find((l) => Math.abs(l.mid - mid) < fontPx * 0.6);
        if (line) line.width += rect.width;
        else lines.push({ mid, width: rect.width });
      }
      if (lines.length < 2) continue;
      const widest = Math.max(...lines.map((l) => l.width));
      const lh = s.lineHeight === 'normal' ? 1.2 : parseFloat(s.lineHeight) / fontPx;
      blocks.push({ chars: text.length, lines: lines.length, fullLines: lines.reduce((a, l) => a + l.width / widest, 0), lineHeight: lh });
    }
    return { chars, sizeCredit, blocks, uiCopy, userCopy, lang: document.documentElement.lang || 'en' };
  }, app.userContent);

  const metrics: Record<string, Metric> = {};
  metrics['body-size'] = metric(stats.chars ? round((100 * stats.sizeCredit) / stats.chars, 1) : null, stats.chars ? stats.sizeCredit / stats.chars : null, stats.chars, 1);
  const blockChars = stats.blocks.reduce((a, b) => a + b.chars, 0);
  const weighted = (f: (b: TextStats['blocks'][number]) => number) => (blockChars ? stats.blocks.reduce((a, b) => a + b.chars * f(b), 0) / blockChars : null);
  const meanLh = weighted((b) => b.lineHeight);
  metrics['line-height'] = metric(meanLh, weighted((b) => ramp(b.lineHeight, 1.2, 1.5)), blockChars, 1);
  const meanCpl = weighted((b) => b.chars / b.fullLines);
  metrics['measure'] = metric(meanCpl, weighted((b) => band(b.chars / b.fullLines, 25, 45, 80, 110)), blockChars, 1);

  const english = stats.lang.toLowerCase().startsWith('en');
  const ui = readability(stats.uiCopy);
  const reported: Record<string, number | string> = { 'ui-words': ui.words };
  if (english && ui.words >= 100) {
    metrics['flesch'] = metric(ui.fre, ramp(ui.fre, 30, 60), ui.words, 1);
    metrics['sentence-length'] = metric(ui.meanSentence, ramp(ui.meanSentence, 30, 20), ui.sentences, 1);
    metrics['fk-grade'] = reportOnly(ui.grade, ui.words);
  }
  const user = readability(stats.userCopy);
  if (english && user.words >= 100) {
    reported['user-flesch'] = user.fre;
    reported['user-fk-grade'] = user.grade;
  }
  return { score: category(metrics), reported };
}
