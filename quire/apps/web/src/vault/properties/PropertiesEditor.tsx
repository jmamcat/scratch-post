import { splitFrontmatter } from '@quire/vault';

/** Stub for packet 0002/P06: read-only list for now; replace the body, keep the props. */
export function PropertiesEditor(props: { text: string; onChange: (text: string) => void }) {
  const data = splitFrontmatter(props.text).data ?? {};
  const rows = Object.entries(data);
  if (rows.length === 0) return <p className="muted">No properties.</p>;
  return (
    <dl className="props">
      {rows.map(([k, v]) => (
        <div key={k} data-property={k}>
          <dt>{k}</dt>
          <dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}
