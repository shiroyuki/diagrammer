import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import { useEffect } from 'react';
import { useGraphStore } from '../model/store';
import { useThemeStore } from '../theme/themeStore';
import { FlowEdgeView } from './FlowEdge';
import { FlowNodeView } from './FlowNode';

const nodeTypes = { flow: FlowNodeView };
const edgeTypes = { flow: FlowEdgeView };

export function Canvas() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const viewVersion = useGraphStore((s) => s.viewVersion);
  const theme = useThemeStore((s) => s.resolved);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (viewVersion === 0) return;
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 250 }), 100);
    return () => clearTimeout(t);
  }, [viewVersion, fitView]);

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        colorMode={theme}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={40}
        deleteKeyCode={null}
        selectionOnDrag
        panOnDrag={[1, 2]}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
        zoomOnDoubleClick={false}
        edgesReconnectable={false}
        minZoom={0.2}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable ariaLabel="Diagram overview" />
      </ReactFlow>
      {nodes.length === 0 && (
        <div className="empty-hint">
          <strong>Nothing here yet</strong>
          <span>Click “Add node”, or import Mermaid text.</span>
        </div>
      )}
    </div>
  );
}
