/**
 * Attachment path rules (R-VLT-11). Like note paths, but the extension must be one of the
 * allowed attachment types. Pure functions, safe for Node and the browser.
 */
import { InvalidPathError } from './paths.ts';

const CONTROL = /[\u0000-\u001f\u007f]/;

/** Allowed attachment extensions (lowercase, no dot) and the content type each is served as. */
const MIME: Record<string, string> = {
  // images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  heic: 'image/heic',
  // documents
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',
  // video
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
};

/** Lowercase extension of the last segment, without the dot; "" when there is none. */
function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Normalises a client-supplied attachment path and rejects anything outside the vault.
 * Backslashes become `/` and the result is Unicode NFC. The path must be relative, have no
 * empty, `.`, `..` or dot-prefixed (hidden) segments, and end in an allowed extension.
 */
export function normalizeFilePath(path: string): string {
  if (typeof path !== 'string') throw new InvalidPathError('path must be a string');
  const s = path.replace(/\\/g, '/').normalize('NFC');
  if (s.length === 0) throw new InvalidPathError('path is empty');
  if (CONTROL.test(s)) throw new InvalidPathError('path contains control characters');
  for (const seg of s.split('/')) {
    if (seg === '') throw new InvalidPathError('path has an empty segment or is absolute');
    if (seg === '.' || seg === '..') throw new InvalidPathError('path has a . or .. segment');
    if (seg.startsWith('.')) throw new InvalidPathError('path segments must not start with "."');
  }
  if (!(extensionOf(s) in MIME)) throw new InvalidPathError('this file type is not allowed as an attachment');
  return s;
}

/** True when `path` is a valid attachment path (it would pass `normalizeFilePath` unchanged in meaning). */
export function isAttachmentPath(path: string): boolean {
  try {
    normalizeFilePath(path);
    return true;
  } catch (e) {
    if (e instanceof InvalidPathError) return false;
    throw e;
  }
}

/** Content type for a path, by extension; `application/octet-stream` when unknown. */
export function mimeOf(path: string): string {
  return MIME[extensionOf(path)] ?? 'application/octet-stream';
}
