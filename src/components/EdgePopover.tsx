import { useGraphStore } from '../model/store';
import {
  ARROW_KINDS,
  LINE_KINDS,
  type ArrowKind,
  type EdgeStyle,
  type FlowEdge,
  type LineKind,
} from '../model/types';
import { ColorField } from './ColorField';
import { Popover } from './Popover';

const LINE_LABELS: Record<LineKind, string> = { solid: 'Solid', dotted: 'Dotted', thick: 'Thick' };
const ARROW_LABELS: Record<ArrowKind, string> = { arrow: 'Arrow', none: 'None', circle: 'Circle', cross: 'Cross' };

interface Props {
  edge: FlowEdge;
  anchor: HTMLElement;
  onClose: () => void;
}

export function EdgePopover({ edge, anchor, onClose }: Props) {
  const { updateSelectedEdges, setEdgeLabel, requestDelete } = useGraphStore.getState();
  const style = edge.data!.style;
  const patch = (p: Partial<EdgeStyle>, key?: string) => updateSelectedEdges(p, key);

  return (
    <Popover anchor={anchor} label="Edge properties" onClose={onClose}>
      <div className="panel">
        <div className="field">
          <span className="field-label">Line</span>
          <div className="segmented" role="group" aria-label="Line style">
            {LINE_KINDS.map((k) => (
              <button key={k} aria-pressed={style.line === k} onClick={() => patch({ line: k })}>
                {LINE_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`arrow-${edge.id}`}>
            Arrowhead
          </label>
          <select
            id={`arrow-${edge.id}`}
            value={style.arrow}
            onChange={(e) => patch({ arrow: e.target.value as ArrowKind })}
          >
            {ARROW_KINDS.map((k) => (
              <option key={k} value={k}>
                {ARROW_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <ColorField
          label="Color"
          value={style.color}
          fallback="#64748b"
          onChange={(color) => patch({ color }, 'edge-color')}
        />
        <div className="field">
          <label className="field-label" htmlFor={`label-${edge.id}`}>
            Label
          </label>
          <input
            id={`label-${edge.id}`}
            type="text"
            value={edge.data!.label}
            onChange={(e) => setEdgeLabel(edge.id, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onClose()}
          />
        </div>
        <button
          className="btn danger"
          onClick={() => {
            onClose();
            requestDelete();
          }}
        >
          Delete…
        </button>
      </div>
    </Popover>
  );
}
