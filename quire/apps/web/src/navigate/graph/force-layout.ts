import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { useEffect, useRef, useState } from 'react';
import type { GraphData } from '@quire/views';

export interface LaidNode extends SimulationNodeDatum {
  path: string;
  title: string;
  r: number;
}

export interface LaidEdge {
  from: LaidNode;
  to: LaidNode;
}

export interface Layout {
  nodes: LaidNode[];
  edges: LaidEdge[];
  settled: boolean;
}

/** Busy notes read as bigger dots (Obsidian sizes nodes by link count, OBS-F-140). */
export function radius(degree: number): number {
  return Math.min(4 + Math.sqrt(degree) * 2.5, 18);
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Point = { x: number; y: number };

/**
 * Lays `data` out with a d3 force simulation and re-renders on every tick until it settles.
 * Positions survive a data change, so an edit nudges the graph instead of re-shuffling it.
 * With reduced motion the simulation runs to rest before anything is drawn.
 */
export function useForceLayout(data: GraphData, degreeOf: (path: string) => number): Layout | null {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [, setFrame] = useState(0);
  const positions = useRef(new Map<string, Point>());
  const degree = useRef(degreeOf);
  degree.current = degreeOf;

  useEffect(() => {
    const before = positions.current;
    const nodes: LaidNode[] = data.nodes.map((n) => ({ path: n.path, title: n.title, r: radius(degree.current(n.path)), ...before.get(n.path) }));
    const byPath = new Map(nodes.map((n) => [n.path, n]));
    const edges: LaidEdge[] = data.edges.map((e) => ({ from: byPath.get(e.from)!, to: byPath.get(e.to)! }));
    const sim = forceSimulation(nodes)
      .force('link', forceLink(edges.map((e) => ({ source: e.from, target: e.to }))).distance(60))
      .force('charge', forceManyBody().strength(-160).distanceMax(400))
      .force('center', forceCenter(0, 0))
      // A weak pull keeps notes without links from drifting off.
      .force('x', forceX(0).strength(0.04))
      .force('y', forceY(0).strength(0.04))
      .force('collide', forceCollide<LaidNode>((n) => n.r + 6))
      .alphaDecay(0.04)
      .stop();
    if (nodes.some((n) => before.has(n.path))) sim.alpha(0.3);
    const current: Layout = { nodes, edges, settled: false };
    const remember = () => (positions.current = new Map(nodes.map((n) => [n.path, { x: n.x ?? 0, y: n.y ?? 0 }])));
    const settle = () => {
      current.settled = true;
      remember();
      setFrame((f) => f + 1);
    };

    if (reducedMotion()) {
      sim.tick(Math.ceil(Math.log(sim.alphaMin() / sim.alpha()) / Math.log(1 - sim.alphaDecay())));
      settle();
      setLayout(current);
      return () => void sim.stop();
    }

    setLayout(current);
    let raf = 0;
    const step = () => {
      sim.tick();
      if (sim.alpha() < sim.alphaMin()) return settle();
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      remember();
    };
  }, [data]);

  return layout;
}
