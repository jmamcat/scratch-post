import { titleOf } from '@quire/vault';
import { useMemo, useState } from 'react';
import { fuzzyFilter } from '../../shared/fuzzy.ts';
import { Highlight, Picker, type PickerItem } from '../../shared/Picker.tsx';
import { templateFolder, templatePaths } from './template-folder.ts';

interface Props {
  paths: readonly string[];
  /** "Insert template" or "New note from template": the dialog's title. */
  label: string;
  onPick: (templatePath: string) => void;
  onClose: () => void;
}

/** Fuzzy pick a note from the templates folder (R-VLT-13, R-VLT-14). */
export function TemplatePicker({ paths, label, onPick, onClose }: Props) {
  const [query, setQuery] = useState('');
  const folder = templateFolder();
  const templates = useMemo(() => templatePaths(paths, folder), [paths, folder]);
  const results = useMemo(
    () => (query.trim() ? fuzzyFilter(templates, query, (p) => [titleOf(p)]).map((r) => ({ path: r.item, indices: r.match.indices })) : templates.map((p) => ({ path: p, indices: [] as number[] }))),
    [templates, query],
  );
  const items: PickerItem[] = results.map((r) => ({ key: r.path, label: <Highlight text={titleOf(r.path)} indices={r.indices} /> }));
  return (
    <Picker
      label={label}
      placeholder="Find a template..."
      query={query}
      onQuery={setQuery}
      items={items}
      empty={templates.length ? 'No template matches.' : `No templates yet. Notes in ${folder || 'the top of the vault'} are templates.`}
      onPick={(i) => {
        onClose();
        onPick(results[i]!.path);
      }}
      onClose={onClose}
    />
  );
}
