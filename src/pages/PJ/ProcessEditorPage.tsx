import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { nodeTypes, type ProcessNodeData } from '@/components/areapj/processos/ProcessNode';
import { NodePalette } from '@/components/areapj/processos/NodePalette';
import { PropertiesPanel } from '@/components/areapj/processos/PropertiesPanel';
import {
  useProcess,
  useCreateProcessStep,
  useUpdateProcessStep,
  useDeleteProcessStep,
  useCreateProcessConnection,
  useDeleteProcessConnection,
} from '@/hooks/useProcessEditor';

// Map DB steps/connections to React Flow nodes/edges
function stepsToNodes(steps: any[]): Node[] {
  return steps.map((s) => ({
    id: s.id,
    type: 'processNode',
    position: { x: s.position_x, y: s.position_y },
    data: {
      title: s.title,
      description: s.description,
      node_type: s.node_type || 'default',
      color_scheme: s.color_scheme,
      icon: s.icon,
      estimated_time: s.estimated_time,
      responsible_role: s.responsible_role,
      stepId: s.id,
    } satisfies ProcessNodeData,
  }));
}

function connectionsToEdges(conns: any[]): Edge[] {
  return conns.map((c) => ({
    id: c.id,
    source: c.source_step_id,
    target: c.target_step_id,
    label: c.label || undefined,
    type: c.connection_type === 'straight' ? 'straight' : c.connection_type === 'bezier' ? 'default' : 'smoothstep',
    animated: c.animated ?? false,
    data: { label: c.label, connection_type: c.connection_type, animated: c.animated },
  }));
}

function ProcessEditorCanvas() {
  const { id: processId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const { data: process, isLoading } = useProcess(processId);
  const createStep = useCreateProcessStep();
  const updateStep = useUpdateProcessStep();
  const deleteStep = useDeleteProcessStep();
  const createConn = useCreateProcessConnection();
  const deleteConn = useDeleteProcessConnection();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load data from DB
  useEffect(() => {
    if (process) {
      setNodes(stepsToNodes(process.steps));
      setEdges(connectionsToEdges(process.connections));
    }
  }, [process, setNodes, setEdges]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      if (!processId || !params.source || !params.target) return;
      createConn.mutate(
        { process_id: processId, source_step_id: params.source, target_step_id: params.target },
        {
          onSuccess: (data) => {
            setEdges((eds) =>
              addEdge(
                {
                  ...params,
                  id: data.id,
                  type: 'smoothstep',
                  animated: false,
                  data: { label: null, connection_type: 'smoothstep', animated: false },
                },
                eds
              )
            );
          },
        }
      );
    },
    [processId, createConn, setEdges]
  );

  // Drop handler for palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance || !processId) return;

      const type = event.dataTransfer.getData('application/reactflow-type');
      const label = event.dataTransfer.getData('application/reactflow-label');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      createStep.mutate(
        {
          process_id: processId,
          title: label || 'Nova Etapa',
          order_index: nodes.length,
          position_x: position.x,
          position_y: position.y,
          node_type: type,
        },
        {
          onSuccess: (data) => {
            const newNode: Node = {
              id: data.id,
              type: 'processNode',
              position,
              data: {
                title: data.title,
                description: data.description,
                node_type: data.node_type || type,
                color_scheme: data.color_scheme,
                stepId: data.id,
              } satisfies ProcessNodeData,
            };
            setNodes((nds) => [...nds, newNode]);
          },
        }
      );
    },
    [reactFlowInstance, processId, createStep, nodes.length, setNodes]
  );

  // Node position change (drag end)
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (!processId) return;
      updateStep.mutate({
        id: node.id,
        process_id: processId,
        position_x: node.position.x,
        position_y: node.position.y,
      });
    },
    [processId, updateStep]
  );

  // Selection handlers
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Properties update handlers
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<ProcessNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
      if (processId) {
        updateStep.mutate({ id: nodeId, process_id: processId, ...updates } as any);
      }
      // Update selected node reference
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...updates } } : prev
      );
    },
    [processId, updateStep, setNodes]
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, updates: { label?: string; connection_type?: string; animated?: boolean }) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== edgeId) return e;
          return {
            ...e,
            label: updates.label ?? e.label,
            animated: updates.animated ?? e.animated,
            type:
              updates.connection_type === 'straight'
                ? 'straight'
                : updates.connection_type === 'bezier'
                ? 'default'
                : 'smoothstep',
            data: { ...e.data, ...updates },
          };
        })
      );
      setSelectedEdge((prev) =>
        prev?.id === edgeId
          ? {
              ...prev,
              label: updates.label ?? prev.label,
              animated: updates.animated ?? prev.animated,
              data: { ...prev.data, ...updates },
            }
          : prev
      );
      // Note: edge updates are persisted via delete+recreate or a dedicated update if needed
    },
    [setEdges]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!processId) return;
      deleteStep.mutate({ id: nodeId, process_id: processId });
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [processId, deleteStep, setNodes, setEdges]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (!processId) return;
      deleteConn.mutate({ id: edgeId, process_id: processId });
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [processId, deleteConn, setEdges]
  );

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 h-full">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pj/processos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
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
              const data = { nodes, edges, process };
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
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div className="w-[180px] border-r border-border bg-background/50 p-3 overflow-y-auto hidden md:block">
          <NodePalette onDragStart={handleDragStart} />
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
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
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onClose={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
        onDeleteNode={handleDeleteNode}
        onDeleteEdge={handleDeleteEdge}
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
