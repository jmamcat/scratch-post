import { describe, it, expect } from 'vitest';
import { renderMarkdown, type RenderOptions } from '../src/markdown/render.ts';
import { resolveLink } from '../src/paths.ts';

const vault = ['Projects/Alpha.md', 'b.md', 'img/pic.png'];
const opts = (from = 'x.md'): RenderOptions => ({ resolve: (t) => resolveLink(t, from, vault) });
const render = (text: string, o: RenderOptions = opts()) => renderMarkdown(text, o);

describe('R-RND-01 CommonMark and GFM', () => {
  it('Scenario: Task list - two items with checkboxes, the first checked', () => {
    const html = render('- [x] done\n- [ ] todo');
    const items = html.match(/<li[^>]*>.*?<\/li>/g) ?? [];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/<input[^>]*type="checkbox"[^>]* checked/);
    expect(items[0]).toContain('done');
    expect(items[1]).toMatch(/<input[^>]*type="checkbox"/);
    expect(items[1]).not.toContain('checked');
    expect(items[1]).toContain('todo');
  });

  it('any non-space status char counts as done', () => {
    const html = render('- [?] maybe\n- [-] dropped');
    expect(html).toContain('data-task="?"');
    expect(html.match(/ checked/g)).toHaveLength(2);
  });

  it('task checkboxes carry their source line, front matter included', () => {
    expect(render('---\na: 1\n---\n- [ ] t')).toContain('data-line="3"');
  });

  it('renders tables, strikethrough and scheme autolinks', () => {
    const html = render('| a | b |\n|---|---|\n| 1 | ~~2~~ |\n\nsee https://example.com now');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('<s>2</s>');
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });

  it('does not autolink bare file names that look like domains', () => {
    expect(render('open notes.md')).not.toContain('<a');
  });

  it('a single newline is a line break (Obsidian default)', () => {
    expect(render('one\ntwo')).toContain('one<br>');
  });

  it('headings get unique slug ids', () => {
    const html = render('# Hello World\n## Hello World');
    expect(html).toContain('<h1 id="hello-world">');
    expect(html).toContain('<h2 id="hello-world-1">');
  });
});

describe('R-RND-02 Wikilinks', () => {
  it('Scenario: Alias - links to Projects/Alpha.md with the label', () => {
    const html = render('see [[Alpha|the project]]');
    expect(html).toContain(
      '<a class="internal-link" data-path="Projects/Alpha.md" href="#/Projects/Alpha.md">the project</a>',
    );
  });

  it('Scenario: Unresolved - carries the class unresolved', () => {
    const html = render('[[Nowhere]]');
    expect(html).toMatch(/<a class="internal-link unresolved" data-path="Nowhere.md"[^>]*>Nowhere<\/a>/);
  });

  it('heading and block links pass the subpath to href', () => {
    const html = render('[[Alpha#Intro]] [[b#^id1]]');
    expect(html).toContain('data-subpath="Intro" href="#/Projects/Alpha.md#Intro">Alpha#Intro</a>');
    expect(html).toContain('href="#/b.md#%5Eid1">b#^id1</a>');
  });

  it('uses custom href and keeps the label as written', () => {
    const html = render('[[b]]', { ...opts(), href: (p, h) => `/n/${p}${h ? '?h=' + h : ''}` });
    expect(html).toContain('href="/n/b.md">b</a>');
  });

  it('same-note heading links point at the heading anchor', () => {
    const html = render('[[#My Section]]');
    expect(html).toContain('<a class="internal-link" data-subpath="My Section" href="#my-section">#My Section</a>');
  });

  it('without a resolver, links are treated as resolved with .md implied', () => {
    expect(renderMarkdown('[[Some Note]]')).toContain(
      '<a class="internal-link" data-path="Some Note.md" href="#/Some%20Note.md">Some Note</a>',
    );
  });

  it('accepts \\| as the alias separator inside tables', () => {
    const html = render('| h |\n|---|\n| [[b\\|Bee]] |');
    expect(html).toContain('data-path="b.md" href="#/b.md">Bee</a>');
  });

  it('Markdown links to vault paths are internal links', () => {
    const html = render('[go](Projects/Alpha.md) [miss](<No Such.md>) [web](https://x.org)');
    expect(html).toContain('class="internal-link" data-path="Projects/Alpha.md"');
    expect(html).toContain('class="internal-link unresolved" data-path="No Such.md"');
    expect(html).toContain('<a href="https://x.org">web</a>');
  });

  it('does not render wikilinks inside code', () => {
    const html = render('`[[b]]`\n\n```\n[[b]]\n```');
    expect(html).not.toContain('internal-link');
  });
});

describe('R-RND-03 Embeds', () => {
  it('renders image embeds as <img>, with optional size', () => {
    const html = render('![[pic.png]] ![[pic.png|200]] ![[pic.png|20x10]]', {
      ...opts(),
      imageSrc: (p) => '/files/' + p,
    });
    expect(html).toContain('<img class="embed-image" src="/files/img/pic.png" alt="pic.png">');
    expect(html).toContain('width="200">');
    expect(html).toContain('width="20" height="10">');
  });

  it('renders a note embed as a block that links to the note', () => {
    const html = render('![[Alpha]]');
    expect(html).toBe(
      '<div class="embed" data-path="Projects/Alpha.md"><a class="internal-link" data-path="Projects/Alpha.md" href="#/Projects/Alpha.md">Alpha</a></div>\n',
    );
  });

  it('marks unresolved embeds', () => {
    expect(render('![[Gone]]')).toContain('<div class="embed unresolved" data-path="Gone.md">');
  });

  it('Markdown images use the vault path and Obsidian size syntax', () => {
    const html = render('![alt|30](img/pic.png) ![](https://x.org/a.png)');
    expect(html).toContain('<img class="embed-image" src="img/pic.png" alt="alt" width="30">');
    expect(html).toContain('<img src="https://x.org/a.png" alt="">');
  });
});

describe('R-RND-04 Callouts', () => {
  it('Scenario: Foldable - a collapsed <details> with summary Hidden', () => {
    const html = render('> [!tip]- Hidden\n> body');
    expect(html).toMatch(/^<details class="callout" data-callout="tip"[^>]*>/);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toContain('<summary class="callout-title">Hidden</summary>');
    expect(html).toContain('<div class="callout-content">\n<p>body</p>\n</div>');
    expect(html).not.toContain('<blockquote');
  });

  it('[!type]+ is expanded by default', () => {
    expect(render('> [!note]+ Open\n> x')).toMatch(/<details class="callout"[^>]* open>/);
  });

  it('plain callouts are divs; the title defaults to the type in title case', () => {
    const html = render('> [!WARNING]\n> careful');
    expect(html).toContain('<div class="callout" data-callout="warning" data-callout-base="warning">');
    expect(html).toContain('<div class="callout-title">Warning</div>');
    expect(html).toContain('<p>careful</p>');
  });

  it('aliases and unknown types expose their base style', () => {
    expect(render('> [!faq] Q')).toContain('data-callout="faq" data-callout-base="question"');
    expect(render('> [!custom-thing] Q')).toContain('data-callout="custom-thing" data-callout-base="note"');
  });

  it('titles render inline Markdown and nested callouts work', () => {
    const html = render('> [!info] A **bold** title\n> > [!bug] Inner\n> > text');
    expect(html).toContain('<div class="callout-title">A <strong>bold</strong> title</div>');
    expect(html).toContain('data-callout="bug"');
    expect(html.match(/class="callout"/g)).toHaveLength(2);
  });

  it('ordinary blockquotes stay blockquotes', () => {
    expect(render('> just a quote')).toContain('<blockquote>');
  });
});

describe('R-RND-05 Inline extensions', () => {
  it('==highlight== becomes <mark>', () => {
    expect(render('a ==hi== b')).toContain('<mark>hi</mark>');
  });

  it('#tag and #nested/tag become tag links; numbers and code do not', () => {
    const html = render('#top and #nested/tag, not #1984 or a#b or `#code`');
    expect(html).toContain('<a class="tag" href="#/tag/top">#top</a>');
    expect(html).toContain('<a class="tag" href="#/tag/nested/tag">#nested/tag</a>,');
    expect(html).toContain('#1984');
    expect(html).not.toContain('tag/1984');
    expect(html).not.toContain('tag/b');
    expect(html).toContain('<code>#code</code>');
  });

  it('uses a custom tagHref', () => {
    expect(render('#x', { tagHref: (t) => '/tags/' + t })).toContain('href="/tags/x"');
  });

  it('a heading marker is not a tag', () => {
    expect(render('# Title')).toBe('<h1 id="title">Title</h1>\n');
  });

  it('renders footnotes with their definitions', () => {
    const html = render('Text[^1].\n\n[^1]: The note.');
    expect(html).toContain('class="footnote-ref"');
    expect(html).toContain('<section class="footnotes">');
    expect(html).toContain('The note.');
  });

  it('omits %%comments%% inline and as blocks', () => {
    const html = render('keep %%drop me%% this\n\n%%\nhidden block [[b]]\n\nstill hidden\n%%\nafter');
    expect(html).toContain('keep');
    expect(html).toContain('this');
    expect(html).toContain('after');
    expect(html).not.toContain('drop me');
    expect(html).not.toContain('hidden');
    expect(html).not.toContain('%%');
  });

  it('an unclosed block comment hides the rest; an unmatched inline %% is literal', () => {
    expect(render('shown\n\n%%\nrest')).not.toContain('rest');
    expect(render('100%% sure')).toContain('100%% sure');
  });

  it('keeps %% inside code', () => {
    expect(render('`%%x%%`')).toContain('<code>%%x%%</code>');
  });
});

describe('R-RND-06 Safe output', () => {
  it('Scenario: Script - escaped text and no <script> element', () => {
    const html = render('hi <script>alert(1)</script>\n\n<script>alert(2)</script>');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
  });

  it('escapes attribute values from link targets and aliases', () => {
    const html = render('[["onmouseover="x|<b>]] [[a" x="y]]');
    expect(html).not.toContain('<b>');
    expect(html).not.toMatch(/ onmouseover=/);
    expect(html).not.toMatch(/ x="y"/);
  });

  it('drops javascript: links', () => {
    expect(render('[x](javascript:alert(1))')).not.toContain('href="javascript');
  });
});

describe('R-RND-07 Front matter is not body content', () => {
  it('excludes the YAML block from the output', () => {
    const html = render('---\ntitle: Secret\ntags: [a]\n---\n# Body');
    expect(html).toBe('<h1 id="body">Body</h1>\n');
  });

  it('a --- that is not on line 1 is a thematic break', () => {
    expect(render('text\n\n---\nmore')).toContain('<hr>');
  });
});
