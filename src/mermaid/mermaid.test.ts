import { describe, expect, it } from 'vitest';
import { readableTextColor } from './color';
import { parseMermaid, ParseError } from './parse';
import { LINK_TOKENS, serialize } from './serialize';
import { ARROW_KINDS, LINE_KINDS, SHAPES, type Graph } from '../model/types';

const at = { x: 0, y: 0 };

describe('serialize', () => {
  it('writes header, nodes, edges, styles and linkStyle', () => {
    const g: Graph = {
      direction: 'LR',
      nodes: [
        { id: 'A', label: 'Start', shape: 'stadium', style: { fill: '#ffff00', strokeWidth: 3 }, position: at },
        { id: 'B', label: 'Ok?', shape: 'diamond', style: {}, position: at },
      ],
      edges: [{ from: 'A', to: 'B', label: 'go', style: { line: 'dotted', arrow: 'arrow', color: '#00ff00' } }],
    };
    expect(serialize(g)).toBe(
      [
        'flowchart LR',
        '    A(["Start"])',
        '    B{"Ok?"}',
        '    A -.->|"go"| B',
        '    style A fill:#ffff00,stroke-width:3px,color:#111827',
        '    linkStyle 0 stroke:#00ff00',
        '',
      ].join('\n'),
    );
  });
});

describe('round trip', () => {
  it.each(SHAPES)('keeps shape %s', (shape) => {
    const g: Graph = {
      direction: 'TD',
      nodes: [{ id: 'A', label: 'He said "hi"\nline two', shape, style: {}, position: at }],
      edges: [],
    };
    const back = parseMermaid(serialize(g)).graph;
    expect(back.nodes[0]).toMatchObject({ id: 'A', shape, label: 'He said "hi"\nline two' });
  });

  for (const line of LINE_KINDS) {
    for (const arrow of ARROW_KINDS) {
      it(`keeps link ${line}/${arrow} (${LINK_TOKENS[line][arrow]})`, () => {
        const g: Graph = {
          direction: 'TD',
          nodes: [
            { id: 'A', label: 'a', shape: 'rect', style: {}, position: at },
            { id: 'B', label: 'b', shape: 'rect', style: {}, position: at },
          ],
          edges: [{ from: 'A', to: 'B', label: 'x | y', style: { line, arrow, color: '#123456' } }],
        };
        const { graph, issues } = parseMermaid(serialize(g));
        expect(issues).toEqual([]);
        expect(graph.edges).toEqual(g.edges);
      });
    }
  }

  it('keeps node styles', () => {
    const g: Graph = {
      direction: 'BT',
      nodes: [{ id: 'A', label: 'a', shape: 'hexagon', style: { fill: '#fff', stroke: '#000', strokeWidth: 4, color: '#111' }, position: at }],
      edges: [],
    };
    const back = parseMermaid(serialize(g)).graph;
    expect(back.direction).toBe('BT');
    expect(back.nodes[0].style).toEqual(g.nodes[0].style);
  });
});

describe('parse', () => {
  it('reads hand-written mermaid, chains and alternate label syntax', () => {
    const { graph, issues } = parseMermaid(`
      %% comment
      graph TB
      A[Start] --> B{Is it?}
      B -- yes --> C(Fine) --> D((End))
      B -.->|no| E
      C ==> F[/slanted/]
    `);
    expect(issues).toEqual([]);
    expect(graph.direction).toBe('TD');
    expect(graph.nodes.map((n) => [n.id, n.shape, n.label])).toEqual([
      ['A', 'rect', 'Start'],
      ['B', 'diamond', 'Is it?'],
      ['C', 'round', 'Fine'],
      ['D', 'circle', 'End'],
      ['E', 'rect', 'E'],
      ['F', 'parallelogram', 'slanted'],
    ]);
    expect(graph.edges.map((e) => [e.from, e.to, e.label, e.style.line])).toEqual([
      ['A', 'B', '', 'solid'],
      ['B', 'C', 'yes', 'solid'],
      ['C', 'D', '', 'solid'],
      ['B', 'E', 'no', 'dotted'],
      ['C', 'F', '', 'thick'],
    ]);
  });

  it('reports unsupported lines instead of dropping them silently', () => {
    const { graph, issues } = parseMermaid(
      ['flowchart TD', 'subgraph one', 'A --> B', 'end', 'A & B --> C', 'style Z fill:#fff', 'style A fill:rgb(1,2,3)'].join('\n'),
    );
    expect(graph.edges).toHaveLength(1);
    expect(issues.map((i) => i.line)).toEqual([2, 4, 5, 6, 7]);
    expect(issues.every((i) => i.reason.length > 0)).toBe(true);
  });

  it('throws when there is no flowchart header', () => {
    expect(() => parseMermaid('sequenceDiagram\nA->>B: hi')).toThrow(ParseError);
    expect(() => parseMermaid('   ')).toThrow(ParseError);
  });

  it('skips front matter', () => {
    expect(parseMermaid('---\ntitle: x\n---\nflowchart LR\nA-->B').graph.edges).toHaveLength(1);
  });
});

describe('readableTextColor', () => {
  it('picks dark text on light fills and light text on dark fills', () => {
    expect(readableTextColor('#ccffcc')).toBe('#111827');
    expect(readableTextColor('#fff')).toBe('#111827');
    expect(readableTextColor('#0b1220')).toBe('#ffffff');
    expect(readableTextColor('#1e3a8a')).toBe('#ffffff');
  });
  it('leaves unreadable or missing fills to the theme', () => {
    expect(readableTextColor(undefined)).toBeUndefined();
    expect(readableTextColor('tomato')).toBeUndefined();
  });
  it('never overrides an explicit text color', () => {
    const g: Graph = {
      direction: 'TD',
      nodes: [{ id: 'A', label: 'a', shape: 'rect', style: { fill: '#ffffff', color: '#ff0000' }, position: at }],
      edges: [],
    };
    expect(serialize(g)).toContain('color:#ff0000');
    expect(serialize(g)).not.toContain('#111827');
  });
});
