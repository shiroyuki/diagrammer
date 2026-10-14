import { useOnViewportChange } from '@xyflow/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchor: HTMLElement;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/** Floating panel rendered at the document root so canvas zoom doesn't scale it. */
export function Popover({ anchor, label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const box = ref.current?.getBoundingClientRect();
    const w = box?.width ?? 0;
    const h = box?.height ?? 0;
    setPos({
      left: Math.max(8, Math.min(a.right - w + 12, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(a.bottom + 6, window.innerHeight - h - 8)),
    });
  }, [anchor]);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchor.contains(t)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchor.focus();
      }
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [anchor, onClose]);

  useOnViewportChange({ onStart: onClose });

  return createPortal(
    <div ref={ref} className="popover" role="dialog" aria-label={label} style={pos}>
      {children}
    </div>,
    document.body,
  );
}
