// Minimal types for markdown-it plugins that ship without declarations.

declare module 'markdown-it-footnote' {
  import type { PluginSimple } from 'markdown-it';
  const footnote: PluginSimple;
  export default footnote;
}

declare module 'markdown-it-mark' {
  import type { PluginSimple } from 'markdown-it';
  const mark: PluginSimple;
  export default mark;
}
