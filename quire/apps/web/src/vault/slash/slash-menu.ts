import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** Runs an app command by id (the palette's commands). */
export type RunCommand = (id: string) => void;

interface Insert {
  label: string;
  detail: string;
  text: string;
  /** Caret position inside `text`; the end when absent. */
  caret?: number;
}

const TABLE_HEAD = '| Column | Column |\n| --- | --- |\n| ';

const INSERTS: Insert[] = [
  { label: 'Heading 1', detail: '#', text: '# ' },
  { label: 'Heading 2', detail: '##', text: '## ' },
  { label: 'Heading 3', detail: '###', text: '### ' },
  { label: 'Bulleted list', detail: '-', text: '- ' },
  { label: 'Numbered list', detail: '1.', text: '1. ' },
  { label: 'Task', detail: '- [ ]', text: '- [ ] ' },
  { label: 'Quote', detail: '>', text: '> ' },
  { label: 'Code block', detail: '```', text: '```\n\n```', caret: 4 },
  { label: 'Callout', detail: '> [!note]', text: '> [!note] ' },
  { label: 'Table', detail: '| |', text: `${TABLE_HEAD} |  |`, caret: TABLE_HEAD.length },
  { label: 'Divider', detail: '---', text: '---\n' },
];

const COMMANDS = [
  { label: 'Insert template', id: 'insert-template' },
  { label: 'Insert attachment', id: 'attach' },
];

const CODE = /^(FencedCode|CodeBlock|InlineCode|CodeText|CodeInfo)$/;

function inCode(state: EditorState, pos: number): boolean {
  for (let n: { name: string; parent: unknown } | null = syntaxTree(state).resolveInner(pos, -1); n; n = n.parent as typeof n) {
    if (CODE.test(n.name)) return true;
  }
  return false;
}

/** `/` at the start of a line or after whitespace, outside code, with letters after it (R-VLT-15). */
function slashSource(run: RunCommand) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const m = ctx.matchBefore(/\/[\w-]*$/);
    if (!m) return null;
    const line = ctx.state.doc.lineAt(m.from);
    const before = line.text.slice(0, m.from - line.from);
    if (before !== '' && !/\s$/.test(before)) return null;
    if (inCode(ctx.state, m.from)) return null;
    // Every insert is line syntax: chosen mid-line, it starts a new line.
    const lead = /^\s*$/.test(before) ? '' : '\n';
    // The filter is the text after the slash; `from` - 1 is the slash itself.
    const options: Completion[] = [
      ...INSERTS.map(
        (i): Completion => ({
          label: i.label,
          detail: i.detail,
          type: 'text',
          apply: (view: EditorView, _c: Completion, from: number, to: number) => {
            const text = lead + i.text;
            view.dispatch({
              changes: { from: from - 1, to, insert: text },
              selection: { anchor: from - 1 + lead.length + (i.caret ?? i.text.length) },
              userEvent: 'input.complete',
            });
          },
        }),
      ),
      ...COMMANDS.map(
        (c): Completion => ({
          label: c.label,
          type: 'function',
          apply: (view: EditorView, _c: Completion, from: number, to: number) => {
            view.dispatch({ changes: { from: from - 1, to, insert: '' }, userEvent: 'input.complete' });
            run(c.id);
          },
        }),
      ),
    ];
    return { from: m.from + 1, options, validFor: /^[\w-]*$/ };
  };
}

/** The slash menu (R-VLT-15): CodeMirror's completion list, named "Insert" for screen readers. */
export function slashMenu(run: RunCommand): Extension {
  return [autocompletion({ override: [slashSource(run)], icons: false }), EditorState.phrases.of({ Completions: 'Insert' })];
}
