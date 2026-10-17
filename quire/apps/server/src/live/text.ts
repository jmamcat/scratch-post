import diff from 'fast-diff';
import type * as Y from 'yjs';

/** Turn a Y.Text into `next` with the smallest edits, so live cursors elsewhere stay put. */
export function replaceText(doc: Y.Doc, text: Y.Text, next: string, origin: unknown): void {
  const cur = text.toString();
  if (cur === next) return;
  doc.transact(() => {
    let pos = 0;
    for (const [op, chunk] of diff(cur, next)) {
      if (op === diff.EQUAL) pos += chunk.length;
      else if (op === diff.DELETE) text.delete(pos, chunk.length);
      else {
        text.insert(pos, chunk);
        pos += chunk.length;
      }
    }
  }, origin);
}
