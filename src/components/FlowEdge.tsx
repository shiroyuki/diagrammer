import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../model/store';
import { DEFAULT_EDGE_STYLE, type FlowEdge } from '../model/types';
import { EdgePopover } from './EdgePopover';

function Marker({ id, kind, color }: { id: string; kind: 'arrow' | 'circle' | 'cross'; color: string }) {
  const paint = { fill: color, stroke: color };
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={kind === 'arrow' ? 10 : 9}
      refY={5}
      markerWidth={12}
      markerHeight={12}
      markerUnits="userSpaceOnUse"
      orient="auto"
    >
      {kind === 'arrow' && <path d="M0,0 L10,5 L0,10 z" style={paint} />}
      {kind === 'circle' && <circle cx={5} cy={5} r={4} style={paint} />}
      {kind === 'cross' && <path d="M1,1 L9,9 M9,1 L1,9" style={{ ...paint, fill: 'none', strokeWidth: 1.6 }} />}
    </marker>
  );
}

export function FlowEdgeView(props: EdgeProps<FlowEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props;
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const style = data?.style ?? DEFAULT_EDGE_STYLE;
  const label = data?.label ?? '';
  const color = style.color ?? 'var(--edge)';
  const dotted = style.line === 'dotted';
  const markerId = `marker-${id}`;

  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!selected) setOpen(false);
  }, [selected]);

  const edge = useGraphStore((s) => s.edges.find((e) => e.id === id));

  return (
    <>
      {style.arrow !== 'none' && (
        <defs>
          <Marker id={markerId} kind={style.arrow} color={color} />
        </defs>
      )}
      {selected && <path d={path} className="edge-halo" />}
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={24}
        markerEnd={style.arrow === 'none' ? undefined : `url(#${markerId})`}
        style={{
          stroke: color,
          strokeWidth: style.line === 'thick' ? 4 : 2,
          strokeDasharray: dotted ? '1 7' : undefined,
          strokeLinecap: dotted ? 'round' : 'butt',
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="edge-label"
          style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
        >
          {label !== '' && (
            <span
              className="edge-label-text nodrag nopan"
              onClick={() => useGraphStore.getState().selectEdge(id)}
            >
              {label}
            </span>
          )}
          {selected && (
            <button
              ref={btn}
              type="button"
              className="icon-btn edge-prop-btn nodrag nopan"
              aria-label="Edge properties"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              ⚙
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
      {selected && open && btn.current && edge && <EdgePopover edge={edge} anchor={btn.current} onClose={close} />}
    </>
  );
}
