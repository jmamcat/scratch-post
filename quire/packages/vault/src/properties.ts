import { Document, isMap, isScalar, isSeq, parseDocument } from 'yaml';
import { splitFrontmatter } from './frontmatter.ts';

/** A front matter value the properties pane can write. `null` removes the key. */
export type PropertyValue = string | number | boolean | string[] | null;

const OPEN = /^---[ \t]*(\r?\n)/;

/**
 * Sets, adds or removes one top-level key of the YAML front matter and returns the whole
 * new text (R-VLT-07). The body is kept byte for byte; the YAML is edited as a document so
 * other keys keep their order, comments and quoting. The block is created for the first
 * key and dropped with the last. Throws when the existing block is not a valid YAML map,
 * so an edit never overwrites text the user wrote by hand.
 */
export function setProperty(text: string, key: string, value: PropertyValue): string {
  const fm = splitFrontmatter(text);
  if (fm.raw === null) return value === null ? text : createBlock(text, key, value);

  const doc = parseDocument(fm.raw);
  if (doc.errors.length > 0 || (doc.contents !== null && !isMap(doc.contents))) {
    throw new Error('front matter is not a valid YAML map');
  }

  if (value === null) {
    doc.delete(key);
    const left = isMap(doc.contents) ? doc.contents.items.length : 0;
    if (left === 0) return fm.body;
  } else {
    assign(doc, key, value);
  }

  const eol = OPEN.exec(text)?.[1] ?? '\n';
  const yaml = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).replace(/\n$/, '').replace(/\n/g, eol);
  const rawStart = OPEN.exec(text)![0].length;
  const rawEnd = rawStart + fm.raw.length;
  // An empty block has no newline before the closing fence; supply one.
  return text.slice(0, rawStart) + yaml + (fm.raw === '' ? eol : '') + text.slice(rawEnd);
}

function assign(doc: Document, key: string, value: Exclude<PropertyValue, null>): void {
  const prev = doc.get(key, true);
  if (isSeq(prev) && Array.isArray(value)) {
    // Keep a list written inline (`[a, b]`) inline.
    const next = doc.createNode(value);
    if (isSeq(next)) next.flow = prev.flow;
    doc.set(key, next);
  } else if (isScalar(prev) && !Array.isArray(value)) {
    // Mutating the scalar keeps its quoting style and trailing comment.
    prev.value = value;
  } else {
    doc.set(key, value);
  }
}

function createBlock(text: string, key: string, value: Exclude<PropertyValue, null>): string {
  const doc = new Document({});
  doc.set(key, value);
  const eol = /^[^\n]*?(\r?\n)/.exec(text)?.[1] ?? '\n';
  const yaml = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).replace(/\n/g, eol);
  return `---${eol}${yaml}---${eol}${text}`;
}
