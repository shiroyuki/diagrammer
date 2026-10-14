import { useCallback, useRef, useState } from 'react';
import { useGraphStore } from '../model/store';
import { SHAPES, SHAPE_LABELS, type Shape } from '../model/types';
import { Popover } from './Popover';

/** The vertical-dots button and its menu. Mounted only while the node is selected. */
export function NodeMenu({ shape }: { shape: Shape }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { updateSelectedNodes, setStyleDialog, requestDelete } = useGraphStore.getState();

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="icon-btn node-menu-btn nodrag nopan"
        aria-label="Node properties"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        ⋮
      </button>
      {open && btn.current && (
        <Popover anchor={btn.current} label="Node menu" onClose={close}>
          <div className="menu" role="menu">
            <div className="menu-heading">Shape</div>
            {SHAPES.map((s) => (
              <button
                key={s}
                role="menuitemradio"
                aria-checked={s === shape}
                className="menu-item"
                onClick={() => {
                  updateSelectedNodes((d) => ({ ...d, shape: s }));
                  close();
                }}
              >
                <span className="menu-check">{s === shape ? '✓' : ''}</span>
                {SHAPE_LABELS[s]}
              </button>
            ))}
            <div className="menu-sep" />
            <button
              role="menuitem"
              className="menu-item"
              onClick={() => {
                close();
                setStyleDialog(true);
              }}
            >
              <span className="menu-check" />
              Edit style…
            </button>
            <button
              role="menuitem"
              className="menu-item danger"
              onClick={() => {
                close();
                requestDelete();
              }}
            >
              <span className="menu-check" />
              Delete…
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}
