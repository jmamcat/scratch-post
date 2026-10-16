import './graph.css';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { Workspace } from '../../sync/index.ts';
import { type GraphData, linkGraph, neighbourhood } from '@quire/views';
import { type LaidNode, type Layout, useForceLayout } from './force-layout.ts';
import { type Bounds, fit, usePanZoom } from './viewport.ts';

interface Props {
  ws: Workspace;
  version: number;
  /** Set: the local graph around this path (R-NAV-09). Unset: every note (R-NAV-08). */
  focus?: string | null;
  /** Hops from `focus` the local graph shows. */
  depth?: number;
  onOpen: (path: string) => void;
}

/**
 * Notes as nodes and resolved links as edges, laid out by a force simulation (Obsidian's
 * graph view, OBS-F-070, OBS-F-140, OBS-F-141). Scenarios read `svg[aria-label]`,
 * `g[data-node]` and `line[data-from][data-to]`.
 */
export function GraphView(props: Props) {
  const { ws, version, focus = null, depth = 2 } = props;
  const full = useMemo(() => linkGraph([...ws.notes()], (t, from) => ws.links.resolve(t, from)), [ws, version]);
  const shown = useStableGraph(useMemo(() => (focus ? neighbourhood(full, focus, depth) : full), [full, focus, depth]));
  // Size by links across the whole vault, so a note looks the same in both graphs.
  const degree = useMemo(() => new Map(full.nodes.map((n) => [n.path, n.degree])), [full]);
  const layout = useForceLayout(shown, (p) => degree.get(p) ?? 0);

  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const size = useSize(host);
  const { view, panning, handlers } = usePanZoom(svg, fit(bounds(layout), size.w, size.h), focus);
  const [hover, setHover] = useState<string | null>(null);
  const near = useMemo(() => neighbours(layout, hover), [layout, hover]);

  const label = focus ? 'Local graph' : 'Graph';
  const nodes = layout?.nodes ?? [];
  const classes = ['graph', panning ? 'panning' : '', hover ? 'hovering' : '', view.k < 0.45 ? 'far' : ''].filter(Boolean).join(' ');
  return (
    <div className={`graph-host ${focus ? 'graph-local' : 'graph-global'}`} ref={host}>
      <svg ref={svg} aria-label={label} className={classes} width={size.w} height={size.h} {...handlers}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g className="graph-edges">
            {layout?.edges.map((e) => (
              <line
                key={`${e.from.path}\u0000${e.to.path}`}
                data-from={e.from.path}
                data-to={e.to.path}
                className={hover && (e.from.path === hover || e.to.path === hover) ? 'lit' : ''}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
              />
            ))}
          </g>
          {nodes.map((n) => (
            <Node key={n.path} node={n} focus={n.path === focus} dim={near !== null && !near.has(n.path)} onHover={setHover} onOpen={props.onOpen} />
          ))}
        </g>
      </svg>
      {layout && nodes.length === 0 && <p className="muted graph-empty">{focus ? 'This note is not in the graph yet.' : 'No notes yet.'}</p>}
    </div>
  );
}

function Node(props: { node: LaidNode; focus: boolean; dim: boolean; onHover: (p: string | null) => void; onOpen: (p: string) => void }) {
  const { node: n } = props;
  const hitW = Math.max(n.r * 2 + 4, n.title.length * 6.5);
  return (
    <g
      data-node={n.path}
      role="button"
      tabIndex={0}
      aria-label={n.title}
      className={`graph-node${props.focus ? ' focus' : ''}${props.dim ? ' dim' : ''}`}
      transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
      onClick={() => props.onOpen(n.path)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        props.onOpen(n.path);
      }}
      onPointerEnter={() => props.onHover(n.path)}
      onPointerLeave={() => props.onHover(null)}
      onFocus={() => props.onHover(n.path)}
      onBlur={() => props.onHover(null)}
    >
      <title>{n.path}</title>
      {/* The dot and its name are one target; without this the gap between them is background. */}
      <rect className="graph-hit" x={-hitW / 2} y={-n.r - 2} width={hitW} height={n.r * 2 + 18} />
      <circle r={n.r} />
      <text y={n.r + 12} textAnchor="middle">
        {n.title}
      </text>
    </g>
  );
}

/** The same object while nodes and edges are unchanged, so typing in a note does not restart the layout. */
function useStableGraph(g: GraphData): GraphData {
  const last = useRef<{ key: string; graph: GraphData } | null>(null);
  const key = g.nodes.map((n) => n.path).join('\n') + '\u0000' + g.edges.map((e) => `${e.from}\u0001${e.to}`).join('\n');
  if (last.current?.key !== key) last.current = { key, graph: g };
  return last.current.graph;
}

function useSize(el: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const measure = () => setSize({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [el]);
  return size;
}

/** World-space box around every node, with room for its label. */
function bounds(layout: Layout | null): Bounds | null {
  if (!layout || layout.nodes.length === 0) return null;
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const n of layout.nodes) {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    b.minX = Math.min(b.minX, x - n.r - 40);
    b.maxX = Math.max(b.maxX, x + n.r + 40);
    b.minY = Math.min(b.minY, y - n.r);
    b.maxY = Math.max(b.maxY, y + n.r + 16);
  }
  return b;
}

/** The hovered note and the notes it links with; everything else dims. */
function neighbours(layout: Layout | null, hover: string | null): Set<string> | null {
  if (!layout || hover === null) return null;
  const near = new Set([hover]);
  for (const e of layout.edges) {
    if (e.from.path === hover) near.add(e.to.path);
    if (e.to.path === hover) near.add(e.from.path);
  }
  return near;
}
