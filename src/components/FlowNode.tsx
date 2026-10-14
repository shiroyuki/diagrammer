import { Handle, Position, useConnection, type NodeProps } from '@xyflow/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGraphStore } from '../model/store';
import { readableTextColor } from '../mermaid/color';
import type { FlowNode, Shape } from '../model/types';
import { NodeMenu } from './NodeMenu';

const POLYGONS: Partial<Record<Shape, string>> = {
  diamond: '50,0 100,50 50,100 0,50',
  hexagon: '12,0 88,0 100,50 88,100 12,100 0,50',
  parallelogram: '14,0 100,0 86,100 0,100',
};

function LabelEditor({ value, onDone }: { value: string; onDone: (v: string | null) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(value);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <textarea
      ref={ref}
      className="label-editor nodrag nopan nowheel"
      aria-label="Node label"
      rows={Math.max(1, text.split('\n').length)}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onDone(text)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onDone(text);
        } else if (e.key === 'Escape') onDone(null);
      }}
    />
  );
}

export function FlowNodeView({ id, data, selected }: NodeProps<FlowNode>) {
  const [editing, setEditing] = useState(false);
  const connecting = useConnection((c) => c.inProgress);
  const s = data.style;
  const polygon = POLYGONS[data.shape];

  const vars = {
    '--n-fill': s.fill ?? 'var(--node-fill)',
    '--n-stroke': s.stroke ?? 'var(--node-stroke)',
    '--n-sw': `${s.strokeWidth ?? 2}px`,
    '--n-fg': s.color ?? readableTextColor(s.fill) ?? 'var(--node-text)',
  } as CSSProperties;

  const finish = (v: string | null) => {
    setEditing(false);
    if (v !== null && v !== data.label) useGraphStore.getState().setLabel(id, v);
  };

  return (
    <div
      className={`fnode shape-${data.shape}${selected ? ' selected' : ''}${connecting ? ' connecting' : ''}`}
      style={vars}
      onDoubleClick={() => setEditing(true)}
    >
      {polygon ? (
        <svg className="fnode-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <polygon points={polygon} />
        </svg>
      ) : (
        <div className="fnode-bg" aria-hidden />
      )}
      <div className="fnode-label">
        {editing ? <LabelEditor value={data.label} onDone={finish} /> : data.label || ' '}
      </div>
      <Handle id="t" type="source" position={Position.Top} className="fhandle" />
      <Handle id="r" type="source" position={Position.Right} className="fhandle" />
      <Handle id="b" type="source" position={Position.Bottom} className="fhandle" />
      <Handle id="l" type="source" position={Position.Left} className="fhandle" />
      {selected && !editing && <NodeMenu shape={data.shape} />}
    </div>
  );
}
