import type { Workspace } from '../sync/index.ts';

/**
 * Vault history drawer (R-BAK-07): change sets newest first, restore one after confirming.
 * Stub fixed by 0003/P00; P04 implements it.
 */
export function VaultHistory(_props: { ws: Workspace; onClose: () => void }) {
  return null;
}
