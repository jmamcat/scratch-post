/**
 * Toggle the task on a zero-based source line (R-RND-09): `[ ]` becomes `[x]`, any other
 * status character becomes `[ ]`. Lines that are not tasks are returned unchanged.
 */
export function toggleTask(text: string, line: number): string {
  const lines = text.split('\n');
  const cur = lines[line];
  if (cur === undefined) return text;
  const m = /^(\s*(?:[-*+]|\d+[.)])\s+\[)(.)(\])/.exec(cur);
  if (!m) return text;
  lines[line] = `${m[1]}${m[2] === ' ' ? 'x' : ' '}${m[3]}${cur.slice(m[0].length)}`;
  return lines.join('\n');
}
