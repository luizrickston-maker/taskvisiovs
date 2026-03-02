import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import type { ProcessNodeData } from '@/components/areapj/processos/ProcessNode';
import type { ProcessWithDetails } from '@/hooks/useProcessEditor';
import {
  useCreateProcessStep,
  useUpdateProcessStep,
  useDeleteProcessStep,
  useCreateProcessConnection,
  useDeleteProcessConnection,
} from '@/hooks/useProcessEditor';
import type { ProcessStep, ProcessConnection } from '@/types/business';

// --- Mappers ---

function stepsToNodes(steps: ProcessStep[]): Node[] {
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

function connectionsToEdges(conns: ProcessConnection[]): Edge[] {
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

// --- Hook ---

export function useProcessCanvas(processId: string | undefined, process: ProcessWithDetails | undefined) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const createStep = useCreateProcessStep();
  const updateStep = useUpdateProcessStep();
  const deleteStep = useDeleteProcessStep();
  const createConn = useCreateProcessConnection();
  const deleteConn = useDeleteProcessConnection();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Sync from DB
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
                { ...params, id: data.id, type: 'smoothstep', animated: false, data: { label: null, connection_type: 'smoothstep', animated: false } },
                eds,
              ),
            );
          },
        },
      );
    },
    [processId, createConn, setEdges],
  );

  // Drag & drop
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

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      createStep.mutate(
        { process_id: processId, title: label || 'Nova Etapa', order_index: nodes.length, position_x: position.x, position_y: position.y, node_type: type },
        {
          onSuccess: (data) => {
            const newNode: Node = {
              id: data.id,
              type: 'processNode',
              position,
              data: { title: data.title, description: data.description, node_type: data.node_type || type, color_scheme: data.color_scheme, stepId: data.id } satisfies ProcessNodeData,
            };
            setNodes((nds) => [...nds, newNode]);
          },
        },
      );
    },
    [reactFlowInstance, processId, createStep, nodes.length, setNodes],
  );

  // Node drag end → persist position
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      if (!processId) return;
      updateStep.mutate({ id: node.id, process_id: processId, position_x: node.position.x, position_y: node.position.y });
    },
    [processId, updateStep],
  );

  // Selection
  const onNodeClick = useCallback((_: any, node: Node) => { setSelectedNode(node); setSelectedEdge(null); }, []);
  const onEdgeClick = useCallback((_: any, edge: Edge) => { setSelectedEdge(edge); setSelectedNode(null); }, []);
  const onPaneClick = useCallback(() => { setSelectedNode(null); setSelectedEdge(null); }, []);
  const clearSelection = useCallback(() => { setSelectedNode(null); setSelectedEdge(null); }, []);

  // Update handlers
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<ProcessNodeData>) => {
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)));
      if (processId) updateStep.mutate({ id: nodeId, process_id: processId, ...updates } as any);
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...updates } } : prev));
    },
    [processId, updateStep, setNodes],
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
            type: updates.connection_type === 'straight' ? 'straight' : updates.connection_type === 'bezier' ? 'default' : 'smoothstep',
            data: { ...e.data, ...updates },
          };
        }),
      );
      setSelectedEdge((prev) =>
        prev?.id === edgeId ? { ...prev, label: updates.label ?? prev.label, animated: updates.animated ?? prev.animated, data: { ...prev.data, ...updates } } : prev,
      );
    },
    [setEdges],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!processId) return;
      deleteStep.mutate({ id: nodeId, process_id: processId });
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [processId, deleteStep, setNodes, setEdges],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (!processId) return;
      deleteConn.mutate({ id: edgeId, process_id: processId });
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    },
    [processId, deleteConn, setEdges],
  );

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  return {
    reactFlowWrapper,
    setReactFlowInstance,
    nodes, edges,
    onNodesChange, onEdgesChange,
    onConnect, onDragOver, onDrop, onNodeDragStop,
    onNodeClick, onEdgeClick, onPaneClick,
    selectedNode, selectedEdge, clearSelection,
    handleUpdateNode, handleUpdateEdge, handleDeleteNode, handleDeleteEdge,
    handleDragStart,
  };
}
