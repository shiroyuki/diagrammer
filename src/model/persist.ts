import { useGraphStore } from './store';
import { DIRECTIONS, SHAPES, type FlowEdge, type FlowNode } from './types';

const KEY = 'diagrammer.graph.v1';

interface Saved {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: (typeof DIRECTIONS)[number];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function valid(v: any): v is Saved {
  return (
    v &&
    DIRECTIONS.includes(v.direction) &&
    Array.isArray(v.nodes) &&
    Array.isArray(v.edges) &&
    v.nodes.every(
      (n: any) =>
        typeof n?.id === 'string' &&
        isNum(n.position?.x) &&
        isNum(n.position?.y) &&
        typeof n.data?.label === 'string' &&
        SHAPES.includes(n.data?.shape) &&
        typeof n.data?.style === 'object',
    ) &&
    v.edges.every(
      (e: any) => typeof e?.id === 'string' && typeof e.source === 'string' && typeof e.target === 'string' && typeof e.data?.style === 'object',
    )
  );
}

export function loadPersisted(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return valid(v) ? v : null;
  } catch {
    return null;
  }
}

/** Restore the saved diagram, then keep saving (debounced) whenever it changes. */
export function startPersistence(): void {
  const saved = loadPersisted();
  if (saved) {
    useGraphStore.setState({
      direction: saved.direction,
      nodes: saved.nodes.map((n) => ({ id: n.id, type: 'flow', position: n.position, data: n.data })),
      edges: saved.edges.map((e) => ({
        id: e.id,
        type: 'flow',
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        data: e.data,
      })),
    });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  useGraphStore.subscribe((s, prev) => {
    if (s.nodes === prev.nodes && s.edges === prev.edges && s.direction === prev.direction) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const out: Saved = {
          direction: s.direction,
          nodes: s.nodes.map((n) => ({ id: n.id, type: 'flow', position: n.position, data: n.data })),
          edges: s.edges.map((e) => ({
            id: e.id,
            type: 'flow',
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            data: e.data,
          })),
        };
        localStorage.setItem(KEY, JSON.stringify(out));
      } catch {
        /* storage unavailable or full: the diagram simply isn't persisted */
      }
    }, 300);
  });
}
