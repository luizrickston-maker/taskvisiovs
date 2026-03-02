import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { nodeTypes } from '@/components/areapj/processos/ProcessNode';
import { NodePalette } from '@/components/areapj/processos/NodePalette';
import { PropertiesPanel } from '@/components/areapj/processos/PropertiesPanel';
import { useProcess } from '@/hooks/useProcessEditor';
import { useProcessCanvas } from '@/hooks/useProcessCanvas';

function ProcessEditorCanvas() {
  const { id: processId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: process, isLoading } = useProcess(processId);

  const canvas = useProcessCanvas(processId, process);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 h-full" role="status" aria-label="Carregando editor">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pj/processos')} aria-label="Voltar para processos">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center" aria-hidden="true">
            <Workflow className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">
              {process?.name || 'Novo Processo'}
            </h1>
            <p className="text-xs text-muted-foreground">Canvas de Operações</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const data = { nodes: canvas.nodes, edges: canvas.edges, process };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${process?.name || 'processo'}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Processo exportado!');
            }}
          >
            Exportar JSON
          </Button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <aside className="w-[180px] border-r border-border bg-background/50 p-3 overflow-y-auto hidden md:block" aria-label="Paleta de componentes">
          <NodePalette onDragStart={canvas.handleDragStart} />
        </aside>

        {/* Canvas */}
        <div className="flex-1" ref={canvas.reactFlowWrapper}>
          <ReactFlow
            nodes={canvas.nodes}
            edges={canvas.edges}
            onNodesChange={canvas.onNodesChange}
            onEdgesChange={canvas.onEdgesChange}
            onConnect={canvas.onConnect}
            onInit={canvas.setReactFlowInstance}
            onDrop={canvas.onDrop}
            onDragOver={canvas.onDragOver}
            onNodeDragStop={canvas.onNodeDragStop}
            onNodeClick={canvas.onNodeClick}
            onEdgeClick={canvas.onEdgeClick}
            onPaneClick={canvas.onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
            defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
          >
            <Controls className="!bg-background !border-border !shadow-lg [&>button]:!bg-background [&>button]:!border-border [&>button]:!text-foreground" />
            <MiniMap
              className="!bg-background !border-border"
              nodeColor={() => 'hsl(var(--primary))'}
              maskColor="hsl(var(--background) / 0.8)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          </ReactFlow>
        </div>
      </div>

      {/* Properties Panel */}
      <PropertiesPanel
        selectedNode={canvas.selectedNode}
        selectedEdge={canvas.selectedEdge}
        onClose={canvas.clearSelection}
        onUpdateNode={canvas.handleUpdateNode}
        onUpdateEdge={canvas.handleUpdateEdge}
        onDeleteNode={canvas.handleDeleteNode}
        onDeleteEdge={canvas.handleDeleteEdge}
      />
    </div>
  );
}

export default function ProcessEditorPage() {
  return (
    <ReactFlowProvider>
      <ProcessEditorCanvas />
    </ReactFlowProvider>
  );
}
