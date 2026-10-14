import dagre from '@dagrejs/dagre';
import type { Direction, Shape } from '../model/types';

export interface LayoutNode {
  id: string;
  label: string;
  shape: Shape;
  size?: { width: number; height: number };
}

/** Rough footprint of a node before it has been measured by the canvas. */
export function estimateSize(label: string, shape: Shape): { width: number; height: number } {
  const longest = Math.max(1, ...label.split('\n').map((l) => l.length));
  const lines = label.split('\n').length;
  let width = Math.min(280, Math.max(110, longest * 8 + 40));
  let height = 28 * lines + 28;
  if (shape === 'diamond' || shape === 'hexagon') {
    width *= 1.35;
    height = Math.max(height * 1.5, 90);
  }
  if (shape === 'circle') width = height = Math.max(width, 100);
  return { width, height };
}

/** Returns top-left positions (the canvas convention) keyed by node id. */
export function layoutPositions(
  nodes: LayoutNode[],
  edges: { from: string; to: string }[],
  direction: Direction,
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction === 'TD' ? 'TB' : direction, nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    const size = n.size ?? estimateSize(n.label, n.shape);
    sizes.set(n.id, size);
    g.setNode(n.id, { width: size.width, height: size.height });
  }
  for (const e of edges) if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  dagre.layout(g);
  const out = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const p = g.node(n.id);
    const s = sizes.get(n.id)!;
    out.set(n.id, { x: Math.round(p.x - s.width / 2), y: Math.round(p.y - s.height / 2) });
  }
  return out;
}
