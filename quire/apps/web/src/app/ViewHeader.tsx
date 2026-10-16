import { titleOf } from '@quire/vault';
import { Icon } from '../shared/Icon.tsx';
import { folderOf } from '../vault/index.ts';

interface Props {
  /** The open note, or null when none exists. */
  path: string | null;
  /** Name of a view that is not a note (the graph), shown as the page's level-1 heading. */
  title?: string;
  leftOpen: boolean;
  rightOpen: boolean;
  reading: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleReading: () => void;
  onHistory: () => void;
  onDelete: () => void;
}

/** Breadcrumb and the per-note buttons above the content. */
export function ViewHeader(props: Props) {
  const { path, reading } = props;
  const folder = path ? folderOf(path) : '';
  return (
    <header className="view-header">
      <button type="button" className="icon-button" aria-label="Toggle left sidebar" title="Toggle left sidebar" aria-pressed={props.leftOpen} onClick={props.onToggleLeft}>
        <Icon name="sidebar" />
      </button>
      <div className="breadcrumb" title={path ?? ''}>
        {path ? (
          <>
            {folder && <span className="crumb-folder">{folder.split('/').join(' / ')} / </span>}
            <span className="crumb-title">{titleOf(path)}</span>
          </>
        ) : props.title ? (
          <h1 className="view-title">{props.title}</h1>
        ) : null}
      </div>
      {path && (
        <>
          <button
            type="button"
            className="icon-button"
            aria-label={reading ? 'Switch to editing view' : 'Switch to reading view'}
            title={reading ? 'Editing view (Ctrl/Cmd+E)' : 'Reading view (Ctrl/Cmd+E)'}
            onClick={props.onToggleReading}
          >
            <Icon name={reading ? 'pencil' : 'book'} />
          </button>
          <button type="button" className="icon-button" aria-label="Version history" title="Version history" onClick={props.onHistory}>
            <Icon name="history" />
          </button>
          <button type="button" className="icon-button" aria-label="Delete note" title="Delete note" onClick={props.onDelete}>
            <Icon name="trash" />
          </button>
        </>
      )}
      <button type="button" className="icon-button" aria-label="Toggle right sidebar" title="Toggle right sidebar" aria-pressed={props.rightOpen} onClick={props.onToggleRight}>
        <Icon name="sidebarRight" />
      </button>
    </header>
  );
}
