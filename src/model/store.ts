import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { create } from 'zustand';
import { layoutPositions } from '../mermaid/layout';
import { serialize } from '../mermaid/serialize';
import { findFreePosition, newEdgeId, nextNodeId } from './ids';
import {
  DEFAULT_EDGE_STYLE,
  type Direction,
  type EdgeStyle,
  type FlowEdge,
  type FlowNode,
  type FlowNodeData,
  type Graph,
} from './types';

interface Snapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: Direction;
}
interface ClipNode {
  data: FlowNodeData;
  dx: number;
  dy: number;
}

const MAX_HISTORY = 100;
const COALESCE_MS = 1000;
/** Coalescing state for continuous edits (color pickers, typing) and drags. */
let lastKey: string | undefined;
let lastTime = 0;
let dragging = false;

const HANDLES: Record<Direction, { source: string; target: string }> = {
  TD: { source: 'b', target: 't' },
  BT: { source: 't', target: 'b' },
  LR: { source: 'r', target: 'l' },
  RL: { source: 'l', target: 'r' },
};

export interface GraphState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  direction: Direction;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: ClipNode[];
  clipOrigin: { x: number; y: number };
  pasteCount: number;
  /** Bumped when the canvas should re-fit the viewport (import, auto-layout). */
  viewVersion: number;
  pendingDelete: boolean;
  styleDialogOpen: boolean;
  importOpen: boolean;
  aboutOpen: boolean;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (c: Connection) => void;

  addNode: (near?: { x: number; y: number }) => void;
  setLabel: (id: string, label: string) => void;
  updateSelectedNodes: (fn: (d: FlowNodeData) => FlowNodeData, key?: string) => void;
  updateSelectedEdges: (patch: Partial<EdgeStyle>, key?: string) => void;
  setEdgeLabel: (id: string, label: string) => void;

  selectAll: () => void;
  clearSelection: () => void;
  selectEdge: (id: string) => void;
  hasSelection: () => boolean;

  requestDelete: () => void;
  cancelDelete: () => void;
  confirmDelete: () => void;

  copySelection: () => string | null;
  paste: () => void;

  undo: () => void;
  redo: () => void;

  setDirection: (d: Direction) => void;
  autoLayout: () => void;
  importGraph: (g: Graph) => void;
  setStyleDialog: (open: boolean) => void;
  setImportOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
}

const snap = (s: Pick<GraphState, 'nodes' | 'edges' | 'direction'>): Snapshot => ({
  nodes: s.nodes,
  edges: s.edges,
  direction: s.direction,
});

/** History bookkeeping to spread into a `set` result, taken from the state before the change. */
function history(s: GraphState, key?: string): Pick<GraphState, 'past' | 'future'> {
  const now = Date.now();
  if (key && key === lastKey && now - lastTime < COALESCE_MS) {
    lastTime = now;
    return { past: s.past, future: [] };
  }
  lastKey = key;
  lastTime = now;
  return { past: [...s.past, snap(s)].slice(-MAX_HISTORY), future: [] };
}

export function toGraph(nodes: FlowNode[], edges: FlowEdge[], direction: Direction): Graph {
  return {
    direction,
    nodes: nodes.map((n) => ({ id: n.id, ...n.data, position: n.position })),
    edges: edges.map((e) => ({
      from: e.source,
      to: e.target,
      label: e.data?.label ?? '',
      style: e.data?.style ?? DEFAULT_EDGE_STYLE,
    })),
  };
}

/** Which nodes and edges a delete would remove: the selection plus edges attached to selected nodes. */
export function deletionTargets(s: Pick<GraphState, 'nodes' | 'edges'>) {
  const nodeIds = new Set(s.nodes.filter((n) => n.selected).map((n) => n.id));
  const edgeIds = new Set(
    s.edges.filter((e) => e.selected || nodeIds.has(e.source) || nodeIds.has(e.target)).map((e) => e.id),
  );
  return { nodeIds, edgeIds };
}

const edgeFor = (source: string, target: string, direction: Direction, handles?: Partial<Connection>): FlowEdge => ({
  id: newEdgeId(),
  type: 'flow',
  source,
  target,
  sourceHandle: handles?.sourceHandle ?? HANDLES[direction].source,
  targetHandle: handles?.targetHandle ?? HANDLES[direction].target,
  data: { label: '', style: { ...DEFAULT_EDGE_STYLE } },
});

export function graphToFlow(graph: Graph): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = graph.nodes.map((n) => ({
    id: n.id,
    type: 'flow',
    position: n.position,
    data: { label: n.label, shape: n.shape, style: n.style },
  }));
  const edges: FlowEdge[] = graph.edges.map((e) => ({
    ...edgeFor(e.from, e.to, graph.direction),
    data: { label: e.label, style: e.style },
  }));
  return { nodes, edges };
}

export const useGraphStore = create<GraphState>()((set, get) => ({
  nodes: [],
  edges: [],
  direction: 'TD',
  past: [],
  future: [],
  clipboard: [],
  clipOrigin: { x: 0, y: 0 },
  pasteCount: 0,
  viewVersion: 0,
  pendingDelete: false,
  styleDialogOpen: false,
  importOpen: false,
  aboutOpen: false,

  onNodesChange: (changes) =>
    set((s) => {
      const kept = changes.filter((c) => c.type !== 'remove'); // deletion goes through the confirm dialog
      let extra: Partial<GraphState> = {};
      if (kept.some((c) => c.type === 'position' && c.dragging) && !dragging) {
        dragging = true;
        extra = history(s);
      }
      if (kept.some((c) => c.type === 'position' && c.dragging === false)) dragging = false;
      return { ...extra, nodes: applyNodeChanges(kept, s.nodes) };
    }),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes.filter((c) => c.type !== 'remove'), s.edges) })),

  onConnect: (c) =>
    set((s) => {
      if (!c.source || !c.target) return s;
      const duplicate = s.edges.some((e) => e.source === c.source && e.target === c.target);
      if (duplicate) return s;
      return { ...history(s), edges: [...s.edges, edgeFor(c.source, c.target, s.direction, c)] };
    }),

  addNode: (near) =>
    set((s) => {
      const id = nextNodeId(s.nodes.map((n) => n.id));
      const start = near ?? { x: 80, y: 80 };
      const position = findFreePosition(
        s.nodes.map((n) => n.position),
        start,
      );
      const node: FlowNode = {
        id,
        type: 'flow',
        position,
        selected: true,
        data: { label: `Node ${id}`, shape: 'rect', style: {} },
      };
      return {
        ...history(s),
        nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), node],
        edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      };
    }),

  setLabel: (id, label) =>
    set((s) => ({
      ...history(s),
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)),
    })),

  updateSelectedNodes: (fn, key) =>
    set((s) => ({
      ...history(s, key),
      nodes: s.nodes.map((n) => (n.selected ? { ...n, data: fn(n.data) } : n)),
    })),

  updateSelectedEdges: (patch, key) =>
    set((s) => ({
      ...history(s, key),
      edges: s.edges.map((e) =>
        e.selected && e.data ? { ...e, data: { ...e.data, style: { ...e.data.style, ...patch } } } : e,
      ),
    })),

  setEdgeLabel: (id, label) =>
    set((s) => ({
      ...history(s, `edge-label-${id}`),
      edges: s.edges.map((e) => (e.id === id && e.data ? { ...e, data: { ...e.data, label } } : e)),
    })),

  selectAll: () =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.selected ? n : { ...n, selected: true })),
      edges: s.edges.map((e) => (e.selected ? e : { ...e, selected: true })),
    })),

  clearSelection: () =>
    set((s) => ({
      nodes: s.nodes.some((n) => n.selected) ? s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)) : s.nodes,
      edges: s.edges.some((e) => e.selected) ? s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)) : s.edges,
    })),

  selectEdge: (id) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: s.edges.map((e) => ({ ...e, selected: e.id === id })),
    })),

  hasSelection: () => {
    const s = get();
    return s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected);
  },

  requestDelete: () => {
    if (get().hasSelection()) set({ pendingDelete: true });
  },
  cancelDelete: () => set({ pendingDelete: false }),
  confirmDelete: () =>
    set((s) => {
      const { nodeIds, edgeIds } = deletionTargets(s);
      return {
        ...history(s),
        pendingDelete: false,
        nodes: s.nodes.filter((n) => !nodeIds.has(n.id)),
        edges: s.edges.filter((e) => !edgeIds.has(e.id)),
      };
    }),

  copySelection: () => {
    const s = get();
    const picked = s.nodes.filter((n) => n.selected);
    if (!picked.length) return null;
    const minX = Math.min(...picked.map((n) => n.position.x));
    const minY = Math.min(...picked.map((n) => n.position.y));
    set({
      clipboard: picked.map((n) => ({
        data: { ...n.data, style: { ...n.data.style } },
        dx: n.position.x - minX,
        dy: n.position.y - minY,
      })),
      clipOrigin: { x: minX, y: minY },
      pasteCount: 0,
    });
    // Only nodes are copied, so the text form has no connections either.
    return serialize(toGraph(picked, [], s.direction));
  },

  paste: () =>
    set((s) => {
      if (!s.clipboard.length) return s;
      const offset = 24 * (s.pasteCount + 1);
      const ids = new Set(s.nodes.map((n) => n.id));
      const created: FlowNode[] = s.clipboard.map((c) => {
        const id = nextNodeId(ids);
        ids.add(id);
        return {
          id,
          type: 'flow',
          selected: true,
          position: { x: s.clipOrigin.x + c.dx + offset, y: s.clipOrigin.y + c.dy + offset },
          data: { ...c.data, style: { ...c.data.style } },
        };
      });
      return {
        ...history(s),
        pasteCount: s.pasteCount + 1,
        nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...created],
        edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      };
    }),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      lastKey = undefined;
      return { ...prev, past: s.past.slice(0, -1), future: [...s.future, snap(s)], pendingDelete: false };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[s.future.length - 1];
      if (!next) return s;
      lastKey = undefined;
      return { ...next, future: s.future.slice(0, -1), past: [...s.past, snap(s)] };
    }),

  setDirection: (direction) => set((s) => (s.direction === direction ? s : { ...history(s), direction })),

  autoLayout: () =>
    set((s) => {
      const pos = layoutPositions(
        s.nodes.map((n) => ({
          id: n.id,
          label: n.data.label,
          shape: n.data.shape,
          size: n.measured?.width && n.measured?.height ? { width: n.measured.width, height: n.measured.height } : undefined,
        })),
        s.edges.map((e) => ({ from: e.source, to: e.target })),
        s.direction,
      );
      const h = HANDLES[s.direction];
      return {
        ...history(s),
        viewVersion: s.viewVersion + 1,
        nodes: s.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })),
        edges: s.edges.map((e) => ({ ...e, sourceHandle: h.source, targetHandle: h.target })),
      };
    }),

  importGraph: (graph) =>
    set((s) => {
      const pos = layoutPositions(
        graph.nodes.map((n) => ({ id: n.id, label: n.label, shape: n.shape })),
        graph.edges,
        graph.direction,
      );
      const laidOut: Graph = {
        ...graph,
        nodes: graph.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })),
      };
      return {
        ...history(s),
        ...graphToFlow(laidOut),
        direction: graph.direction,
        viewVersion: s.viewVersion + 1,
        pendingDelete: false,
      };
    }),

  setStyleDialog: (styleDialogOpen) => set({ styleDialogOpen }),
  setImportOpen: (importOpen) => set({ importOpen }),
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
}));
