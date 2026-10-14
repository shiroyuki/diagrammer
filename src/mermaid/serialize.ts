import { readableTextColor } from './color';
import type { ArrowKind, EdgeStyle, Graph, LineKind, Shape } from '../model/types';

const WRAP: Record<Shape, [string, string]> = {
  rect: ['[', ']'],
  round: ['(', ')'],
  stadium: ['([', '])'],
  circle: ['((', '))'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
  parallelogram: ['[/', '/]'],
};

export const LINK_TOKENS: Record<LineKind, Record<ArrowKind, string>> = {
  solid: { arrow: '-->', none: '---', circle: '--o', cross: '--x' },
  dotted: { arrow: '-.->', none: '-.-', circle: '-.-o', cross: '-.-x' },
  thick: { arrow: '==>', none: '===', circle: '==o', cross: '==x' },
};

export const NODE_OPENERS: { open: string; close: string; shape: Shape }[] = [
  { open: '([', close: '])', shape: 'stadium' },
  { open: '((', close: '))', shape: 'circle' },
  { open: '{{', close: '}}', shape: 'hexagon' },
  { open: '[/', close: '/]', shape: 'parallelogram' },
  { open: '[', close: ']', shape: 'rect' },
  { open: '(', close: ')', shape: 'round' },
  { open: '{', close: '}', shape: 'diamond' },
];

export function escapeLabel(label: string): string {
  const text = label.replace(/"/g, '#quot;').replace(/\r?\n/g, '<br/>');
  return text.trim() === '' ? ' ' : text;
}

export function linkToken(style: EdgeStyle): string {
  return LINK_TOKENS[style.line][style.arrow];
}

export function serialize(graph: Graph): string {
  const out: string[] = [`flowchart ${graph.direction}`];

  for (const n of graph.nodes) {
    const [open, close] = WRAP[n.shape];
    out.push(`    ${n.id}${open}"${escapeLabel(n.label)}"${close}`);
  }

  for (const e of graph.edges) {
    const label = e.label.trim() === '' ? '' : `|"${escapeLabel(e.label)}"|`;
    out.push(`    ${e.from} ${linkToken(e.style)}${label} ${e.to}`);
  }

  for (const n of graph.nodes) {
    const props: string[] = [];
    if (n.style.fill) props.push(`fill:${n.style.fill}`);
    if (n.style.stroke) props.push(`stroke:${n.style.stroke}`);
    if (n.style.strokeWidth) props.push(`stroke-width:${n.style.strokeWidth}px`);
    // A custom fill with no explicit text color gets a readable one, so the diagram reads in any theme.
    const color = n.style.color ?? readableTextColor(n.style.fill);
    if (color) props.push(`color:${color}`);
    if (props.length) out.push(`    style ${n.id} ${props.join(',')}`);
  }

  graph.edges.forEach((e, i) => {
    if (e.style.color) out.push(`    linkStyle ${i} stroke:${e.style.color}`);
  });

  return out.join('\n') + '\n';
}
