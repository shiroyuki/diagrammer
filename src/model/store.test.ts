import { beforeEach, describe, expect, it } from 'vitest';
import { deletionTargets, useGraphStore } from './store';
import { DEFAULT_EDGE_STYLE, type FlowEdge, type FlowNode } from './types';

const node = (id: string, x = 0, y = 0, selected = false): FlowNode => ({
  id,
  type: 'flow',
  position: { x, y },
  selected,
  data: { label: id, shape: 'rect', style: {} },
});
const edge = (id: string, source: string, target: string, selected = false): FlowEdge => ({
  id,
  type: 'flow',
  source,
  target,
  selected,
  data: { label: '', style: { ...DEFAULT_EDGE_STYLE } },
});

const get = () => useGraphStore.getState();

beforeEach(() => {
  useGraphStore.setState({
    nodes: [node('A'), node('B', 200, 0), node('C', 400, 0)],
    edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
    direction: 'TD',
    past: [],
    future: [],
    clipboard: [],
    pasteCount: 0,
    pendingDelete: false,
  });
});

describe('delete', () => {
  it('does nothing without a selection', () => {
    get().requestDelete();
    expect(get().pendingDelete).toBe(false);
  });

  it('asks first, and cancelling keeps everything', () => {
    get().onNodesChange([{ id: 'B', type: 'select', selected: true }]);
    get().requestDelete();
    expect(get().pendingDelete).toBe(true);
    get().cancelDelete();
    expect(get().nodes).toHaveLength(3);
    expect(get().edges).toHaveLength(2);
  });

  it('cascades to edges attached to deleted nodes', () => {
    get().onNodesChange([{ id: 'B', type: 'select', selected: true }]);
    expect(deletionTargets(get()).edgeIds.size).toBe(2);
    get().requestDelete();
    get().confirmDelete();
    expect(get().nodes.map((n) => n.id)).toEqual(['A', 'C']);
    expect(get().edges).toEqual([]);
  });

  it('deletes a selected edge alone', () => {
    get().onEdgesChange([{ id: 'e1', type: 'select', selected: true }]);
    get().requestDelete();
    get().confirmDelete();
    expect(get().nodes).toHaveLength(3);
    expect(get().edges.map((e) => e.id)).toEqual(['e2']);
  });

  it('ignores the canvas built-in remove changes', () => {
    get().onNodesChange([{ id: 'A', type: 'remove' }]);
    get().onEdgesChange([{ id: 'e1', type: 'remove' }]);
    expect(get().nodes).toHaveLength(3);
    expect(get().edges).toHaveLength(2);
  });

  it('can be undone', () => {
    get().onNodesChange([{ id: 'B', type: 'select', selected: true }]);
    get().confirmDelete();
    get().undo();
    expect(get().nodes).toHaveLength(3);
    expect(get().edges).toHaveLength(2);
  });
});

describe('copy and paste', () => {
  it('pastes new nodes without connections, even between copied nodes', () => {
    useGraphStore.setState({ nodes: [node('A', 0, 0, true), node('B', 200, 0, true), node('C', 400, 0)] });
    const text = get().copySelection();
    expect(text).toContain('A["A"]');
    expect(text).not.toContain('-->');
    get().paste();
    expect(get().nodes).toHaveLength(5);
    expect(get().edges).toHaveLength(2); // unchanged: no edges were created for the copies
    const pasted = get().nodes.slice(3);
    expect(pasted.every((n) => n.selected)).toBe(true);
    expect(get().nodes.slice(0, 3).some((n) => n.selected)).toBe(false);
    for (const p of pasted) {
      expect(get().edges.some((e) => e.source === p.id || e.target === p.id)).toBe(false);
    }
  });

  it('never collides ids, and offsets repeated pastes', () => {
    useGraphStore.setState({ nodes: [node('A', 0, 0, true), node('B', 50, 50)] });
    get().copySelection();
    get().paste();
    get().paste();
    get().paste();
    const ids = get().nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    const xs = get().nodes.slice(2).map((n) => n.position.x);
    expect(xs).toEqual([24, 48, 72]);
  });

  it('copies label, shape and style but not selection state', () => {
    useGraphStore.setState({
      nodes: [{ ...node('A', 10, 10, true), data: { label: 'Hi', shape: 'diamond', style: { fill: '#fff' } } }],
    });
    get().copySelection();
    get().paste();
    expect(get().nodes[1].data).toEqual({ label: 'Hi', shape: 'diamond', style: { fill: '#fff' } });
    expect(get().nodes[1].data.style).not.toBe(get().nodes[0].data.style);
  });

  it('copies nothing when no node is selected', () => {
    expect(get().copySelection()).toBeNull();
  });
});

describe('selection', () => {
  it('selects all and clears', () => {
    get().selectAll();
    expect(get().nodes.every((n) => n.selected) && get().edges.every((e) => e.selected)).toBe(true);
    get().clearSelection();
    expect(get().hasSelection()).toBe(false);
  });

  it('applies shape changes to every selected node', () => {
    useGraphStore.setState({ nodes: [node('A', 0, 0, true), node('B', 0, 0, true), node('C')] });
    get().updateSelectedNodes((d) => ({ ...d, shape: 'hexagon' }));
    expect(get().nodes.map((n) => n.data.shape)).toEqual(['hexagon', 'hexagon', 'rect']);
  });
});

describe('edges', () => {
  it('can undo an edge style change', () => {
    get().onEdgesChange([{ id: 'e1', type: 'select', selected: true }]);
    get().updateSelectedEdges({ line: 'dotted', color: '#ff0000' });
    expect(get().edges[0].data?.style).toMatchObject({ line: 'dotted', color: '#ff0000' });
    get().undo();
    expect(get().edges[0].data?.style).toEqual(DEFAULT_EDGE_STYLE);
    get().redo();
    expect(get().edges[0].data?.style.line).toBe('dotted');
  });

  it('coalesces continuous edits into one undo step', () => {
    get().onEdgesChange([{ id: 'e1', type: 'select', selected: true }]);
    for (const c of ['#111111', '#222222', '#333333']) get().updateSelectedEdges({ color: c }, 'color-test');
    expect(get().edges[0].data?.style.color).toBe('#333333');
    get().undo();
    expect(get().edges[0].data?.style.color).toBeUndefined();
  });

  it('does not create duplicate or half-open connections', () => {
    get().onConnect({ source: 'A', target: 'B', sourceHandle: null, targetHandle: null });
    get().onConnect({ source: 'A', target: null as unknown as string, sourceHandle: null, targetHandle: null });
    expect(get().edges).toHaveLength(2);
    get().onConnect({ source: 'A', target: 'C', sourceHandle: 'r', targetHandle: 'l' });
    expect(get().edges).toHaveLength(3);
    expect(get().edges[2]).toMatchObject({ source: 'A', target: 'C', sourceHandle: 'r', targetHandle: 'l' });
  });
});

describe('add node', () => {
  it('uses the next free id, selects it alone, and avoids overlap', () => {
    useGraphStore.setState({ nodes: [node('A', 80, 80, true)] });
    get().addNode({ x: 80, y: 80 });
    expect(get().nodes.map((n) => [n.id, !!n.selected])).toEqual([['A', false], ['B', true]]);
    expect(get().nodes[1].position).not.toEqual(get().nodes[0].position);
  });
});
