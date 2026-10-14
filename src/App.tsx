import { ReactFlowProvider } from '@xyflow/react';
import { AboutDialog } from './components/AboutDialog';
import { Canvas } from './components/Canvas';
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog';
import { ImportDialog } from './components/ImportDialog';
import { MermaidPanel } from './components/MermaidPanel';
import { StyleDialog } from './components/StyleDialog';
import { Toolbar } from './components/Toolbar';
import { useShortcuts } from './shortcuts';

export function App() {
  useShortcuts();
  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar />
        <main className="main">
          <Canvas />
          <MermaidPanel />
        </main>
      </div>
      <ConfirmDeleteDialog />
      <StyleDialog />
      <ImportDialog />
      <AboutDialog />
    </ReactFlowProvider>
  );
}
