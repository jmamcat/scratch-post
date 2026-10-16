import { useMemo, useState } from 'react';
import type { Command } from '../commands.ts';
import { formatHotkey } from '../commands.ts';
import { fuzzyFilter } from '../lib/fuzzy.ts';
import { Highlight, Picker } from './Picker.tsx';

/** Ctrl/Cmd+P: every command by name, with its hotkey (R-NAV-05, OBS-UX-06). */
export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const available = useMemo(() => commands.filter((c) => c.enabled?.() ?? true), [commands]);
  const results = useMemo(
    () => (query.trim() ? fuzzyFilter(available, query, (c) => [c.name]) : available.map((item) => ({ item, match: { score: 0, indices: [] as number[] }, key: 0 }))),
    [available, query],
  );
  return (
    <Picker
      label="Command palette"
      placeholder="Type a command..."
      query={query}
      onQuery={setQuery}
      items={results.map((r) => ({
        key: r.item.id,
        label: <Highlight text={r.item.name} indices={r.match.indices} />,
        ...(r.item.hotkeys?.[0] ? { aside: <kbd>{formatHotkey(r.item.hotkeys[0])}</kbd> } : {}),
      }))}
      empty="No matching commands."
      onPick={(i) => {
        const cmd = results[i]!.item;
        onClose();
        // Let the palette close (and restore focus) before the command opens its own UI.
        setTimeout(() => cmd.run(), 0);
      }}
      onClose={onClose}
    />
  );
}
