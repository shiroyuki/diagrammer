import { useGraphStore } from '../model/store';
import type { NodeStyle } from '../model/types';
import { ColorField } from './ColorField';
import { Modal } from './Modal';

export function StyleDialog() {
  const open = useGraphStore((s) => s.styleDialogOpen);
  const first = useGraphStore((s) => s.nodes.find((n) => n.selected));
  const count = useGraphStore((s) => s.nodes.filter((n) => n.selected).length);
  const { setStyleDialog, updateSelectedNodes } = useGraphStore.getState();
  const style: NodeStyle = first?.data.style ?? {};
  const patch = (p: Partial<NodeStyle>, key: string) =>
    updateSelectedNodes((d) => ({ ...d, style: { ...d.style, ...p } }), key);
  const close = () => setStyleDialog(false);

  return (
    <Modal open={open} title="Node style" onClose={close}>
      <p className="muted">{count > 1 ? `Applies to ${count} selected nodes.` : 'Applies to the selected node.'}</p>
      <ColorField label="Fill" value={style.fill} fallback="#ffffff" onChange={(fill) => patch({ fill }, 'style-fill')} />
      <ColorField
        label="Stroke"
        value={style.stroke}
        fallback="#334155"
        onChange={(stroke) => patch({ stroke }, 'style-stroke')}
      />
      <ColorField
        label="Text"
        value={style.color}
        fallback="#111827"
        onChange={(color) => patch({ color }, 'style-color')}
      />
      <div className="field">
        <label className="field-label" htmlFor="stroke-width">
          Stroke width
        </label>
        <select
          id="stroke-width"
          value={style.strokeWidth ?? ''}
          onChange={(e) => patch({ strokeWidth: e.target.value ? Number(e.target.value) : undefined }, 'style-width')}
        >
          <option value="">Default</option>
          {[1, 2, 3, 4, 6].map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>
      </div>
      <div className="modal-actions">
        <button
          className="btn"
          onClick={() => updateSelectedNodes((d) => ({ ...d, style: {} }))}
        >
          Reset style
        </button>
        <button className="btn primary" data-autofocus onClick={close}>
          Done
        </button>
      </div>
    </Modal>
  );
}
