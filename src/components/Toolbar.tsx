import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '../model/store';
import { DIRECTIONS, type Direction } from '../model/types';
import { useThemeStore, type ThemeMode } from '../theme/themeStore';

const THEME_ICON: Record<ThemeMode, string> = { system: '◐', light: '☀', dark: '☾' };
const DIR_LABEL: Record<Direction, string> = { TD: 'Top → Down', LR: 'Left → Right', BT: 'Bottom → Up', RL: 'Right → Left' };

export function Toolbar() {
  const rf = useReactFlow();
  const canUndo = useGraphStore((s) => s.past.length > 0);
  const canRedo = useGraphStore((s) => s.future.length > 0);
  const direction = useGraphStore((s) => s.direction);
  const mode = useThemeStore((s) => s.mode);
  const { addNode, undo, redo, autoLayout, setDirection, setImportOpen, setAboutOpen } = useGraphStore.getState();

  const add = () => {
    const r = document.querySelector('.react-flow')?.getBoundingClientRect();
    const c = r ? rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : null;
    addNode(c ? { x: c.x - 60, y: c.y - 25 } : undefined);
  };

  return (
    <header className="toolbar">
      <h1>Diagrammer</h1>
      <button className="btn primary" onClick={add}>
        + Add node
      </button>
      <button className="btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
        Undo
      </button>
      <button className="btn" onClick={redo} disabled={!canRedo} title="Redo (Shift+Ctrl/Cmd+Z)">
        Redo
      </button>
      <label className="inline">
        Direction
        <select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {DIR_LABEL[d]}
            </option>
          ))}
        </select>
      </label>
      <button className="btn" onClick={autoLayout}>
        Auto-layout
      </button>
      <span className="spacer" />
      <button className="btn" onClick={() => setImportOpen(true)}>
        Import…
      </button>
      <button className="btn" onClick={() => setAboutOpen(true)}>
        About
      </button>
      <button
        className="btn"
        onClick={() => useThemeStore.getState().cycle()}
        aria-label={`Theme: ${mode}. Click to change.`}
        title={`Theme: ${mode}`}
      >
        {THEME_ICON[mode]} {mode[0].toUpperCase() + mode.slice(1)}
      </button>
    </header>
  );
}
