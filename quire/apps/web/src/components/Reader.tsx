import { extractHeadings, renderMarkdown, splitFrontmatter } from '@quire/core';
import { useMemo } from 'react';
import { noteHash } from '../router.ts';

interface Props {
  text: string;
  /** Resolves a link target to a vault path, or null. */
  resolve: (target: string) => string | null;
  onInternalLink: (path: string, resolved: boolean, subpath?: string) => void;
  onTag: (tag: string) => void;
  className?: string;
  label?: string;
}

/** Reading view: the note rendered with `@quire/core` (raw HTML escaped, R-RND-06). */
export function Reader({ text, resolve, onInternalLink, onTag, className, label }: Props) {
  const html = useMemo(
    () => renderMarkdown(text, { resolve: (t) => (t === '' ? null : resolve(t)), href: (p, h) => noteHash(p, h) }),
    [text, resolve],
  );
  const props = useMemo(() => Object.entries(splitFrontmatter(text).data ?? {}), [text]);
  return (
    <div
      className={`reader markdown ${className ?? ''}`}
      aria-label={label ?? 'Reading view'}
      role="document"
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a');
        if (!a) return;
        const href = a.getAttribute('href') ?? '';
        if (a.classList.contains('internal-link')) {
          e.preventDefault();
          const path = a.dataset['path'] ?? '';
          const sub = a.dataset['subpath'];
          if (!path && sub) {
            document.getElementById(headingSlug(text, sub) ?? '')?.scrollIntoView({ block: 'start' });
            return;
          }
          onInternalLink(path, !a.classList.contains('unresolved'), sub);
        } else if (a.classList.contains('tag')) {
          e.preventDefault();
          onTag(decodeURIComponent(href.replace(/^#\/tag\//, '')));
        } else if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        } else if (href.startsWith('#') && !href.startsWith('#/')) {
          // Footnotes and in-page anchors.
          e.preventDefault();
          document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView({ block: 'start' });
        }
      }}
    >
      {props.length > 0 && (
        <dl className="reader-props" aria-label="Properties">
          {props.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{Array.isArray(v) ? v.map(String).join(', ') : v instanceof Date ? v.toISOString().slice(0, 10) : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')}</dd>
            </div>
          ))}
        </dl>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** The renderer's anchor id for a heading named in a link subpath. */
export function headingSlug(text: string, heading: string): string | null {
  const want = heading.trim().toLowerCase();
  const h = extractHeadings(text).find((x) => x.text.toLowerCase() === want || x.slug === heading);
  return h ? h.slug : null;
}
