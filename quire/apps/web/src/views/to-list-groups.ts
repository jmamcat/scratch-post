import type { Group } from '@quire/views';
import type { ListGroup } from '../shared/GroupList.tsx';

/** `@quire/views` groups as the groups `GroupList` shows. */
export function toListGroups(groups: Group[]): ListGroup[] {
  return groups.map((g) => ({ label: g.label, items: g.items.map((path) => ({ path })) }));
}
