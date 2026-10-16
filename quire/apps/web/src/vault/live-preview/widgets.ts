import { type EditorView, WidgetType } from '@codemirror/view';

/**
 * Markup hidden by Live Preview. The raw characters stay in the DOM under `display: none`,
 * so the editor's DOM text still equals the note (tools that read the editor DOM, such as
 * the scenario driver, see the Markdown) while a person sees only the rendered text.
 */
export class HiddenSource extends WidgetType {
  constructor(readonly source: string) {
    super();
  }

  override eq(other: HiddenSource): boolean {
    return other.source === this.source;
  }

  toDOM(): HTMLElement {
    const outer = document.createElement('span');
    outer.className = 'cm-lp-hidden';
    outer.appendChild(sourceSpan(this.source));
    return outer;
  }
}

/** A task marker (`[ ]`, `[x]`) shown as a checkbox; clicking it rewrites the marker. */
export class TaskCheckbox extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly source: string,
  ) {
    super();
  }

  override eq(other: TaskCheckbox): boolean {
    return other.checked === this.checked && other.source === this.source;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-lp-task';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = this.checked;
    box.tabIndex = -1;
    box.setAttribute('aria-label', this.checked ? 'Uncheck task' : 'Check task');
    // Keep the selection where it is: moving it onto this line would reveal the raw marker
    // and remove the checkbox before the click lands.
    box.addEventListener('mousedown', (e) => e.preventDefault());
    box.addEventListener('click', (e) => {
      // The document, not the input, owns the state; the redraw shows the new value.
      e.preventDefault();
      toggleTask(view, view.posAtDOM(wrap));
    });
    wrap.append(box, sourceSpan(this.source));
    return wrap;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

/** Flip the task marker that starts at `pos` with an ordinary user transaction. */
export function toggleTask(view: EditorView, pos: number): boolean {
  const marker = view.state.sliceDoc(pos, pos + 3);
  if (!/^\[[ xX]\]$/.test(marker)) return false;
  view.dispatch({
    changes: { from: pos + 1, to: pos + 2, insert: marker[1] === ' ' ? 'x' : ' ' },
    userEvent: 'input.toggle-task',
  });
  return true;
}

function sourceSpan(text: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'cm-lp-source';
  span.textContent = text;
  return span;
}
