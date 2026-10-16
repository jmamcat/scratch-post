import { type MouseEvent, type PointerEvent, type RefObject, useEffect, useRef, useState } from 'react';

/** Screen position = world position × k + (x, y). */
export interface View {
  x: number;
  y: number;
  k: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const MIN_K = 0.1;
const MAX_K = 4;
const PAD = 32;

const clamp = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/** The view that centres `b` in a `w` × `h` box, never zoomed in past 1:1 (small graphs stay small). */
export function fit(b: Bounds | null, w: number, h: number): View {
  if (!b || w === 0 || h === 0) return { x: w / 2, y: h / 2, k: 1 };
  const k = clamp(Math.min(1, (w - 2 * PAD) / Math.max(1, b.maxX - b.minX), (h - 2 * PAD) / Math.max(1, b.maxY - b.minY)));
  return { x: w / 2 - ((b.minX + b.maxX) / 2) * k, y: h / 2 - ((b.minY + b.maxY) / 2) * k, k };
}

/**
 * Wheel zooms around the pointer, dragging the background pans, double-clicking it fits the
 * graph again. Until the person moves the view it follows `auto` (the fitted view).
 */
export function usePanZoom(svg: RefObject<SVGSVGElement | null>, auto: View) {
  const [manual, setManual] = useState<View | null>(null);
  const [panning, setPanning] = useState(false);
  const view = manual ?? auto;
  const latest = useRef(view);
  latest.current = view;
  const drag = useRef<{ id: number; sx: number; sy: number; from: View } | null>(null);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    // React's wheel listener is passive; the page must not scroll while zooming.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect();
      const px = e.clientX - box.left;
      const py = e.clientY - box.top;
      const v = latest.current;
      const k = clamp(v.k * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002)));
      setManual({ k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [svg]);

  const handlers = {
    onPointerDown(e: PointerEvent<SVGSVGElement>) {
      if (e.button !== 0 || (e.target as Element).closest('[data-node]')) return;
      drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, from: latest.current };
      e.currentTarget.setPointerCapture(e.pointerId);
      setPanning(true);
    },
    onPointerMove(e: PointerEvent<SVGSVGElement>) {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      setManual({ k: d.from.k, x: d.from.x + e.clientX - d.sx, y: d.from.y + e.clientY - d.sy });
    },
    onPointerUp(e: PointerEvent<SVGSVGElement>) {
      if (drag.current?.id !== e.pointerId) return;
      drag.current = null;
      setPanning(false);
    },
    onDoubleClick(e: MouseEvent<SVGSVGElement>) {
      if (!(e.target as Element).closest('[data-node]')) setManual(null);
    },
  };

  return { view, panning, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}
