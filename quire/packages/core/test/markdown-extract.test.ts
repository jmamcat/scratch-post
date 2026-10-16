import { describe, it, expect } from 'vitest';
import { extractHeadings, extractLinks, extractTags } from '../src/markdown/extract.ts';
import { splitFrontmatter } from '../src/markdown/frontmatter.ts';
import { renderMarkdown } from '../src/markdown/render.ts';
import { resolveLink } from '../src/paths.ts';

describe('splitFrontmatter (R-RND-07)', () => {
  it('splits YAML properties from the body', () => {
    const text = '---\ntitle: Hi\ntags: [a, b]\n---\n# Body\n';
    const fm = splitFrontmatter(text);
    expect(fm.raw).toBe('title: Hi\ntags: [a, b]');
    expect(fm.data).toEqual({ title: 'Hi', tags: ['a', 'b'] });
    expect(fm.body).toBe('# Body\n');
    expect(text.slice(0, fm.bodyStart) + fm.body).toBe(text);
  });

  it('no front matter: whole text is body', () => {
    expect(splitFrontmatter('# x\n---\n')).toEqual({ data: null, raw: null, body: '# x\n---\n', bodyStart: 0 });
  });

  it('must start at byte 0', () => {
    expect(splitFrontmatter('\n---\na: 1\n---\n').raw).toBeNull();
  });

  it('an unclosed block is not front matter', () => {
    expect(splitFrontmatter('---\na: 1\nbody').raw).toBeNull();
  });

  it('handles an empty block, CRLF and a file that ends at the fence', () => {
    expect(splitFrontmatter('---\n---\nbody')).toEqual({ data: {}, raw: '', body: 'body', bodyStart: 8 });
    const crlf = splitFrontmatter('---\r\na: 1\r\n---\r\nbody');
    expect(crlf.raw).toBe('a: 1');
    expect(crlf.data).toEqual({ a: 1 });
    expect(crlf.body).toBe('body');
    expect(splitFrontmatter('---\na: 1\n---')).toMatchObject({ raw: 'a: 1', body: '' });
  });

  it('invalid YAML or a non-map keeps raw but gives null data', () => {
    const bad = splitFrontmatter('---\na: [1\n---\nbody');
    expect(bad.raw).toBe('a: [1');
    expect(bad.data).toBeNull();
    expect(bad.body).toBe('body');
    expect(splitFrontmatter('---\n- a\n- b\n---\n').data).toBeNull();
  });

  it('keeps dates as strings', () => {
    expect(splitFrontmatter('---\ndate: 2024-01-02\n---\n').data).toEqual({ date: '2024-01-02' });
  });
});

describe('extractLinks', () => {
  it('finds wikilinks with alias, heading, block and embeds, with offsets', () => {
    const text = 'a [[One]] b [[Two|2]] [[Three#Sec]] [[Four#^blk|x]] ![[pic.png|100]] [[#Local]]';
    const links = extractLinks(text);
    expect(links.map(({ start, end, ...l }) => l)).toEqual([
      { target: 'One', embed: false },
      { target: 'Two', alias: '2', embed: false },
      { target: 'Three', heading: 'Sec', embed: false },
      { target: 'Four', block: 'blk', alias: 'x', embed: false },
      { target: 'pic.png', alias: '100', embed: true },
      { target: '', heading: 'Local', embed: false },
    ]);
    for (const l of links) {
      expect(text.slice(l.start, l.end)).toMatch(/^!?\[\[.*\]\]$/);
    }
    expect(text.slice(links[4]!.start, links[4]!.end)).toBe('![[pic.png|100]]');
  });

  it('finds Markdown links and images to vault paths, decoded', () => {
    const text = '[A](Folder/My%20Note.md#Part) [B](<Other Note.md>) ![](img/p.png) [web](https://x.org) [top](#h)';
    const links = extractLinks(text);
    expect(links.map(({ start, end, ...l }) => l)).toEqual([
      { target: 'Folder/My Note.md', heading: 'Part', alias: 'A', embed: false },
      { target: 'Other Note.md', alias: 'B', embed: false },
      { target: 'img/p.png', embed: true },
    ]);
    expect(text.slice(links[0]!.start, links[0]!.end)).toBe('[A](Folder/My%20Note.md#Part)');
  });

  it('skips code spans, code blocks and comments', () => {
    const text = [
      '`[[span]]` [[real]]',
      '```',
      '[[fenced]]',
      '```',
      '',
      '    [[indented]]',
      '',
      '%%[[commented]]%%',
      '``` md',
      '[[open fence to end]]',
    ].join('\n');
    expect(extractLinks(text).map((l) => l.target)).toEqual(['real']);
  });

  it('includes quoted wikilinks in front matter, with offsets into the full text', () => {
    const text = '---\nrelated: "[[Other]]"\n---\nbody [[Body]]';
    const links = extractLinks(text);
    expect(links.map((l) => l.target)).toEqual(['Other', 'Body']);
    expect(text.slice(links[1]!.start, links[1]!.end)).toBe('[[Body]]');
    expect(text.slice(links[0]!.start, links[0]!.end)).toBe('[[Other]]');
  });

  it('Scenario: Backlink appears - a.md links [[b]], so b.md lists a.md', () => {
    const docs = new Map([
      ['a.md', 'see [[b]]'],
      ['b.md', '# B'],
      ['c.md', 'no links'],
    ]);
    const paths = [...docs.keys()];
    const backlinks = (target: string) =>
      paths.filter((from) =>
        extractLinks(docs.get(from)!).some((l) => resolveLink(l.target, from, paths) === target),
      );
    expect(backlinks('b.md')).toEqual(['a.md']);
    expect(backlinks('a.md')).toEqual([]);
  });
});

describe('extractTags (R-NAV-03)', () => {
  it('Scenario: Both sources - tags: [work] and body #idea/raw', () => {
    expect(extractTags('---\ntags: [work]\n---\n#idea/raw\n')).toEqual(['work', 'idea/raw']);
  });

  it('accepts a single string or a list, with or without #', () => {
    expect(extractTags('---\ntags: solo\n---\n')).toEqual(['solo']);
    expect(extractTags('---\ntags:\n  - "#one"\n  - two/three\n---\n')).toEqual(['one', 'two/three']);
    expect(extractTags('---\ntags: a, b\n---\n')).toEqual(['a', 'b']);
  });

  it('skips code, comments, numbers, headings and mid-word hashes', () => {
    const text = [
      '# Heading',
      '`#span` %%#hidden%% #1984 #y1984 a#b [link](#anchor) https://x.org/#frag',
      '```',
      '#fenced',
      '```',
      '#ok_tag-1 and #émoji/ünï',
    ].join('\n');
    expect(extractTags(text)).toEqual(['y1984', 'ok_tag-1', 'émoji/ünï']);
  });

  it('de-duplicates case-insensitively, first spelling wins', () => {
    expect(extractTags('---\ntags: [Work]\n---\n#work #idea #Idea #idea/')).toEqual(['Work', 'idea']);
  });

  it('hashtags in other front matter values are not tags', () => {
    expect(extractTags('---\nnote: "#nope"\n---\n')).toEqual([]);
  });
});

describe('extractHeadings (R-NAV-06)', () => {
  it('lists headings with level, plain text, line and the renderer slug', () => {
    const text = '---\na: 1\n---\n# Intro *now*\ntext\n## Links [[Target|Alias]] `code`\n```\n# not a heading\n```\n## Intro now\n';
    const hs = extractHeadings(text);
    expect(hs).toEqual([
      { level: 1, text: 'Intro now', line: 3, slug: 'intro-now' },
      { level: 2, text: 'Links Alias code', line: 5, slug: 'links-alias-code' },
      { level: 2, text: 'Intro now', line: 9, slug: 'intro-now-1' },
    ]);
    const html = renderMarkdown(text);
    for (const h of hs) expect(html).toContain(`id="${h.slug}"`);
  });

  it('headings inside comments are skipped and lines still line up', () => {
    const hs = extractHeadings('%%\n# gone\n%%\n# Kept');
    expect(hs).toEqual([{ level: 1, text: 'Kept', line: 3, slug: 'kept' }]);
  });
});
