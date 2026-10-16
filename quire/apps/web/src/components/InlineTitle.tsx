import { titleOf } from '@quire/core';
import { useEffect, useRef, useState } from 'react';

interface Props {
  path: string;
  focusSignal: number;
  /** Returns an error message, or null when the rename happened. */
  onRename: (name: string) => string | null;
  onDone: () => void;
}

/** Editable note title above the editor, like Obsidian's inline title. Renames the file. */
export function InlineTitle({ path, focusSignal, onRename, onDone }: Props) {
  const [value, setValue] = useState(titleOf(path));
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValue(titleOf(path));
    setError(null);
  }, [path]);
  useEffect(() => {
    if (focusSignal > 0) {
      input.current?.focus();
      input.current?.select();
    }
  }, [focusSignal]);

  const commit = () => {
    const name = value.trim();
    if (!name || name === titleOf(path)) {
      setValue(titleOf(path));
      setError(null);
      return true;
    }
    const problem = onRename(name);
    setError(problem);
    if (problem) setValue(titleOf(path));
    return !problem;
  };

  return (
    <div className="inline-title-wrap">
      <input
        ref={input}
        className="inline-title"
        aria-label="Note title"
        value={value}
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (commit()) onDone();
          } else if (e.key === 'Escape') {
            setValue(titleOf(path));
            setError(null);
            onDone();
          }
        }}
      />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
