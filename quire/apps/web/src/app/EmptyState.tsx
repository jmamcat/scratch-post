import { titleOf } from '@quire/vault';
import { formatHotkey } from '../navigate/index.ts';

interface Props {
  loaded: boolean;
  missing: string | null;
  onNew: () => void;
  onCreate: (p: string) => void;
  onSwitcher: () => void;
  onDaily: () => void;
}

/** Shown when no note is open, or the linked note does not exist. */
export function EmptyState(props: Props) {
  if (!props.loaded) return <div className="empty-state" />;
  if (props.missing) {
    return (
      <div className="empty-state">
        <h2>{titleOf(props.missing)}</h2>
        <p className="muted">This note does not exist (it may have been deleted or renamed).</p>
        <div className="empty-actions">
          <button type="button" className="primary" onClick={() => props.onCreate(props.missing!)}>
            Create it
          </button>
          <button type="button" onClick={props.onSwitcher}>
            Go to file
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <h2>No file is open</h2>
      <div className="empty-actions column">
        <button type="button" className="link-button" onClick={props.onNew}>
          Create new note <kbd>{formatHotkey('Mod+N')}</kbd>
        </button>
        <button type="button" className="link-button" onClick={props.onSwitcher}>
          Go to file <kbd>{formatHotkey('Mod+O')}</kbd>
        </button>
        <button type="button" className="link-button" onClick={props.onDaily}>
          Open today's daily note
        </button>
      </div>
    </div>
  );
}
