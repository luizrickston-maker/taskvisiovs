import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCircle,
  ExternalLink,
  CheckCircle2,
  Circle,
  Users,
  FileDown,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { nodeTypes, type ProcessNodeData } from '@/components/areapj/processos/ProcessNode';
import { useProcess, type ProcessStep } from '@/hooks/useProcessEditor';
import { DelegateProcessDialog } from '@/components/areapj/processos/DelegateProcessDialog';

// Convert DB steps to React Flow nodes (read-only)
function stepsToNodes(steps: ProcessStep[]): Node[] {
  return steps.map((s) => ({
    id: s.id,
    type: 'processNode',
    position: { x: s.position_x, y: s.position_y },
    selectable: false,
    draggable: false,
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
  }));
}

function StepCard({
  step,
  index,
  isActive,
  isCompleted,
  onToggleComplete,
  onClick,
}: {
  step: ProcessStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onToggleComplete: () => void;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const links: { label: string; url: string; icon?: string }[] = Array.isArray(step.support_links) ? step.support_links : [];

  return (
    <div
      className={cn(
        'group relative rounded-xl border-2 p-4 transition-all duration-300 cursor-pointer',
        isActive
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : isCompleted
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-border bg-card hover:border-muted-foreground/30'
      )}
      onClick={() => {
        onClick();
        setExpanded((v) => !v);
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checklist */}
        <div
          className="mt-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
        >
          <Checkbox
            checked={isCompleted}
            className={cn(
              'h-5 w-5 rounded-full transition-colors',
              isCompleted && 'border-emerald-500 bg-emerald-500 text-white data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white'
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">
              {index + 1}
            </Badge>
            <h3
              className={cn(
                'text-sm font-semibold truncate',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {step.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {step.estimated_time && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" /> {step.estimated_time}
              </span>
            )}
            {step.responsible_role && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <UserCircle className="w-3 h-3" /> {step.responsible_role}
              </span>
            )}
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              {step.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {step.description}
                </p>
              )}
              {links.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Links de apoio:</p>
                  {links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {link.label || link.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <ChevronRight
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1',
            expanded && 'rotate-90'
          )}
        />
      </div>
    </div>
  );
}

function ProcessViewCanvas() {
  const { id: processId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: process, isLoading } = useProcess(processId);

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'timeline' | 'flowchart'>('timeline');
  const [delegateOpen, setDelegateOpen] = useState(false);

  const sortedSteps = useMemo(
    () => (process?.steps ?? []).slice().sort((a, b) => a.order_index - b.order_index),
    [process?.steps]
  );

  const nodes = useMemo(() => (process ? stepsToNodes(process.steps) : []), [process]);
  const edges = useMemo(() => (process ? connectionsToEdges(process.connections) : []), [process]);

  const toggleComplete = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const progress = sortedSteps.length > 0 ? (completedSteps.size / sortedSteps.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!process) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Workflow className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Processo não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/pj/processos')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pj/processos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Workflow className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{process.name}</h1>
            <p className="text-xs text-muted-foreground">Guia Interativo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden">
            <button
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'timeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </button>
            <button
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'flowchart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setViewMode('flowchart')}
            >
              Fluxograma
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setDelegateOpen(true)}>
            <Users className="w-4 h-4 mr-1.5" />
            Delegar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ process, completedSteps: [...completedSteps] }, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${process.name}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Exportado com sucesso!');
            }}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => navigate(`/pj/processos/${processId}/editar`)}>
            <Pencil className="w-4 h-4 mr-1.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            Progresso: {completedSteps.size}/{sortedSteps.length} etapas
          </span>
          <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'timeline' ? (
          <div className="flex h-full">
            {/* Steps list */}
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-2xl mx-auto space-y-3">
                {sortedSteps.map((step, i) => (
                  <div key={step.id} className="relative">
                    {/* Timeline connector */}
                    {i < sortedSteps.length - 1 && (
                      <div className="absolute left-[19px] top-[52px] w-0.5 h-[calc(100%+0.75rem-52px)] bg-border" />
                    )}
                    <StepCard
                      step={step}
                      index={i}
                      isActive={activeStepIndex === i}
                      isCompleted={completedSteps.has(step.id)}
                      onToggleComplete={() => toggleComplete(step.id)}
                      onClick={() => setActiveStepIndex(i)}
                    />
                  </div>
                ))}

                {sortedSteps.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Circle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma etapa definida neste processo.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Flowchart view */
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            className="bg-background"
          >
            <Controls className="!bg-background !border-border !shadow-lg [&>button]:!bg-background [&>button]:!border-border [&>button]:!text-foreground" />
            <MiniMap
              className="!bg-background !border-border"
              nodeColor={() => 'hsl(var(--primary))'}
              maskColor="hsl(var(--background) / 0.8)"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          </ReactFlow>
        )}
      </div>

      {/* Bottom navigation */}
      {viewMode === 'timeline' && sortedSteps.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={activeStepIndex <= 0}
            onClick={() => setActiveStepIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Etapa Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {activeStepIndex + 1} de {sortedSteps.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={activeStepIndex >= sortedSteps.length - 1}
            onClick={() => setActiveStepIndex((i) => Math.min(sortedSteps.length - 1, i + 1))}
          >
            Próxima Etapa
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProcessViewPage() {
  return (
    <ReactFlowProvider>
      <ProcessViewCanvas />
    </ReactFlowProvider>
  );
}
