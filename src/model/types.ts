import type { Edge, Node } from '@xyflow/react';

export const SHAPES = ['rect', 'round', 'stadium', 'circle', 'diamond', 'hexagon', 'parallelogram'] as const;
export type Shape = (typeof SHAPES)[number];

export const SHAPE_LABELS: Record<Shape, string> = {
  rect: 'Rectangle',
  round: 'Rounded',
  stadium: 'Stadium',
  circle: 'Circle',
  diamond: 'Diamond (decision)',
  hexagon: 'Hexagon',
  parallelogram: 'Parallelogram',
};

export const DIRECTIONS = ['TD', 'LR', 'BT', 'RL'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export interface NodeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  color?: string;
}

export const LINE_KINDS = ['solid', 'dotted', 'thick'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export const ARROW_KINDS = ['arrow', 'none', 'circle', 'cross'] as const;
export type ArrowKind = (typeof ARROW_KINDS)[number];

export interface EdgeStyle {
  line: LineKind;
  arrow: ArrowKind;
  color?: string;
}

export const DEFAULT_EDGE_STYLE: EdgeStyle = { line: 'solid', arrow: 'arrow' };

export type FlowNodeData = { label: string; shape: Shape; style: NodeStyle };
export type FlowEdgeData = { label: string; style: EdgeStyle };
export type FlowNode = Node<FlowNodeData, 'flow'>;
export type FlowEdge = Edge<FlowEdgeData, 'flow'>;

/** Plain, UI-independent graph used by the serializer, parser and layout. */
export interface GraphNode {
  id: string;
  label: string;
  shape: Shape;
  style: NodeStyle;
  position: { x: number; y: number };
}
export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  style: EdgeStyle;
}
export interface Graph {
  direction: Direction;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
