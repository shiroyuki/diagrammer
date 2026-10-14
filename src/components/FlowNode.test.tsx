import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FlowNode } from '../model/types';
import { FlowNodeView } from './FlowNode';

const render = (selected: boolean) =>
  renderToString(
    <ReactFlowProvider>
      <FlowNodeView
        {...({
          id: 'A',
          selected,
          data: { label: 'Hello', shape: 'diamond', style: {} },
        } as unknown as NodeProps<FlowNode>)}
      />
    </ReactFlowProvider>,
  );

describe('node property button', () => {
  it('is hidden while the node is not selected', () => {
    const html = render(false);
    expect(html).toContain('Hello');
    expect(html).not.toContain('Node properties');
  });

  it('is shown while the node is selected', () => {
    expect(render(true)).toContain('Node properties');
  });

  it('draws polygon shapes as svg and others as plain boxes', () => {
    expect(render(false)).toContain('<polygon');
  });
});
