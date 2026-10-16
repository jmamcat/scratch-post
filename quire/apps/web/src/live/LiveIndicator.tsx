import type { LiveInfo } from './live.ts';
import { colorFor } from './live.ts';

/** Status bar chip: whether the open note is live, and who else is in it. */
export function LiveIndicator({ info }: { info: LiveInfo }) {
  if (info.state === 'off') return null;
  const label = info.state === 'connecting' ? 'Connecting' : info.peers.length ? `Live · ${info.peers.length} other${info.peers.length === 1 ? '' : 's'}` : 'Live';
  return (
    <span className={`live-chip ${info.state}`} title={info.peers.length ? `Also editing: ${info.peers.join(', ')}` : 'Live editing'} aria-label={`Live editing: ${label}`}>
      <span className="live-dot" aria-hidden="true" />
      {label}
      {info.peers.slice(0, 4).map((p) => (
        <span key={p} className="peer" style={{ background: colorFor(p) }} title={p} aria-hidden="true">
          {p.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </span>
  );
}
