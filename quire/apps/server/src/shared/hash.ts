import { createHash } from 'node:crypto';

/** SHA-256 of a text as lowercase hex; matches hashText() in @quire/sync. */
export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
