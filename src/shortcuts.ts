import { useEffect } from 'react';
import { useGraphStore } from './model/store';

/** True when the key or clipboard event is aimed at something the user is typing into. */
export function isEditableTarget(t: unknown): boolean {
  const el = t as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el || typeof el !== 'object') return false;
  return el.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName ?? '');
}

const modalOpen = () => typeof document !== 'undefined' && !!document.querySelector('dialog[open]');
const hasTextSelection = () => (window.getSelection()?.toString() ?? '') !== '';
const blocked = (t: EventTarget | null) => isEditableTarget(t) || modalOpen();

/** Canvas shortcuts. Everything is ignored while typing in a field or while a dialog is open. */
export function useShortcuts(): void {
  useEffect(() => {
    const st = () => useGraphStore.getState();

    const onKeyDown = (e: KeyboardEvent) => {
      if (blocked(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod) {
        if (st().hasSelection()) {
          e.preventDefault();
          st().requestDelete();
        }
      } else if (mod && key === 'a') {
        e.preventDefault();
        st().selectAll();
      } else if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) st().redo();
        else st().undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        st().redo();
      } else if (e.key === 'Escape') {
        st().clearSelection();
      }
    };

    const onCopy = (e: ClipboardEvent) => {
      if (blocked(e.target) || hasTextSelection()) return;
      const text = st().copySelection();
      if (text == null) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', text);
    };
    const onCut = (e: ClipboardEvent) => {
      if (blocked(e.target) || hasTextSelection()) return;
      const text = st().copySelection();
      if (text == null) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', text);
      st().requestDelete(); // cut = copy + the usual delete confirmation
    };
    const onPaste = (e: ClipboardEvent) => {
      if (blocked(e.target) || st().clipboard.length === 0) return;
      e.preventDefault();
      st().paste();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, []);
}
