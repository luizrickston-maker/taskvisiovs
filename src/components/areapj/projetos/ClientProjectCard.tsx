import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, GripVertical, Pencil, Trash2, MoreVertical, CheckCircle2, Hash, FolderKanban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import SlaChip from '@/components/projetos/SlaChip';
import type { Project, ProjectTask } from '@/types/database';

interface ClientProjectCardProps {
  project: Project;
  tasks: ProjectTask[];
  onEdit: () => void;
  onDelete: () => void;
  /** Quando true (PJ), navega para /pj/projetos/:id; senão para /projetos/:id */
  basePath?: 'pj' | 'personal';
}

const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Crítica', color: 'text-priority-critical', bg: 'bg-priority-critical' },
  2: { label: 'Alta',    color: 'text-priority-high',     bg: 'bg-priority-high' },
  3: { label: 'Média',   color: 'text-priority-medium',   bg: 'bg-priority-medium' },
  4: { label: 'Baixa',   color: 'text-priority-low',      bg: 'bg-priority-low' },
  5: { label: 'Mínima',  color: 'text-priority-minimal',  bg: 'bg-priority-minimal' },
};

export function ClientProjectCard({ project, tasks, onEdit, onDelete, basePath = 'pj' }: ClientProjectCardProps) {
  const navigate = useNavigate();
  const { projectStages } = useAppStore();

  const taskProgress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }, [tasks]);

  const stagesSummary = useMemo(() => {
    const stages = projectStages
      .filter(s => s.project_id === project.id)
      .sort((a, b) => a.order_index - b.order_index);
    const total = stages.length;
    const done = stages.filter(s => s.status === 'done').length;
    const current = stages.find(s => s.status === 'in_progress') || stages.find(s => s.status === 'todo');
    const overdueStages = stages.filter(s => {
      if (!s.deadline || s.status === 'done') return false;
      return new Date(s.deadline) < new Date();
    }).length;
    return { total, done, current, overdueStages };
  }, [projectStages, project.id]);

  const priority = priorityConfig[project.priority] || priorityConfig[3];

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-radix-popper-content-wrapper]')) {
      return;
    }
    navigate(basePath === 'pj' ? `/pj/projetos/${project.id}` : `/projetos/${project.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-lg bg-background/80 border border-border/50 hover:shadow-lg hover:bg-background transition-all duration-200 overflow-hidden cursor-pointer hover:border-primary/40"
    >
      {/* Barra colorida de PRIORIDADE no topo */}
      <div className={cn("h-1 w-full", priority.bg)} aria-hidden />

      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-0.5 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />

          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-semibold leading-tight line-clamp-2">{project.project}</p>

            {(project.client_name || project.company_name) && (
              <p className="text-[11px] text-muted-foreground truncate">
                {project.client_name}{project.company_name ? ` · ${project.company_name}` : ''}
              </p>
            )}

            {/* Badges: prioridade + SLA + etapa atual */}
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", priority.color)}>
                P{project.priority} · {priority.label}
              </Badge>
              <SlaChip deadline={project.deadline} status={project.status} />
              {stagesSummary.current && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-primary border-primary/30 bg-primary/5">
                  <Hash className="w-2.5 h-2.5" />
                  {stagesSummary.current.name}
                </Badge>
              )}
            </div>

            {/* Barra segmentada de etapas */}
            {stagesSummary.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FolderKanban className="w-2.5 h-2.5" />
                    {stagesSummary.done}/{stagesSummary.total} etapas
                  </span>
                  {stagesSummary.overdueStages > 0 && (
                    <span className="text-status-blocked font-medium">
                      ⚠ {stagesSummary.overdueStages} atrasada(s)
                    </span>
                  )}
                </div>
                <div className="flex gap-0.5">
                  {projectStages
                    .filter(s => s.project_id === project.id)
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "h-1.5 flex-1 rounded-full",
                          s.status === 'done' && "bg-status-done",
                          s.status === 'in_progress' && "bg-status-progress",
                          s.status === 'blocked' && "bg-status-blocked",
                          s.status === 'todo' && "bg-muted-foreground/30"
                        )}
                        title={`${s.name} · ${s.status}`}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Progresso de tarefas */}
            {taskProgress.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {taskProgress.done}/{taskProgress.total} tarefas
                  </span>
                  <span>{taskProgress.percent}%</span>
                </div>
                <Progress value={taskProgress.percent} className="h-1" />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-0.5">
              {(() => {
                const estimated = tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
                const actual = tasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
                if (estimated === 0) return <span />;
                return (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {actual}h / {estimated}h
                  </Badge>
                );
              })()}

              <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Ver projeto →
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(basePath === 'pj' ? `/pj/projetos/${project.id}` : `/projetos/${project.id}`)} className="gap-2">
                <FolderKanban className="w-3.5 h-3.5" />
                Ver projeto
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
