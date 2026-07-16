import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, GripVertical, Pencil, Trash2, MoreVertical, CheckCircle2, Hash, FolderKanban } from 'lucide-react';
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
import SlaChip from './SlaChip';
import type { Project, ProjectCategory } from '@/types/database';

interface ProjectCardProps {
  project: Project;
  category?: ProjectCategory;
  onEdit: () => void;
  onDelete: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  /** Quando definido, exibe link "Ver projeto" que navega para o detalhe */
  linkToDetail?: boolean;
}

const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Crítica', color: 'text-priority-critical', bg: 'bg-priority-critical' },
  2: { label: 'Alta',    color: 'text-priority-high',     bg: 'bg-priority-high' },
  3: { label: 'Média',   color: 'text-priority-medium',   bg: 'bg-priority-medium' },
  4: { label: 'Baixa',   color: 'text-priority-low',      bg: 'bg-priority-low' },
  5: { label: 'Mínima',  color: 'text-priority-minimal',  bg: 'bg-priority-minimal' },
};

export default function ProjectCard({
  project, category, onEdit, onDelete,
  draggable = true, onDragStart, onDragEnd,
  linkToDetail = false,
}: ProjectCardProps) {
  const navigate = useNavigate();
  const { projectTasks, projectStages } = useAppStore();

  const taskProgress = useMemo(() => {
    const tasks = projectTasks.filter(t => t.project_id === project.id);
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }, [projectTasks, project.id]);

  // Resumo das etapas (segmento de progresso)
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

  const handleClick = (e: React.MouseEvent) => {
    // Não navegar se clicou em botão/menu
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-radix-popper-content-wrapper]')) {
      return;
    }
    if (linkToDetail) {
      navigate(`/projetos/${project.id}`);
    }
  };

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={linkToDetail ? handleClick : undefined}
      className={cn(
        "group relative rounded-lg bg-background/80 border border-border/50",
        "hover:shadow-lg hover:bg-background transition-all duration-200",
        "overflow-hidden",
        linkToDetail && "cursor-pointer hover:border-primary/40"
      )}
    >
      {/* Barra colorida de PRIORIDADE no topo */}
      <div className={cn("h-1 w-full", priority.bg)} aria-hidden />

      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {draggable && (
            <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-0.5 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
          )}

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Nome + Categoria */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-tight line-clamp-2">
                {project.project}
              </p>
            </div>

            {/* Cliente / Empresa */}
            {(project.client_name || project.company_name) && (
              <p className="text-[11px] text-muted-foreground truncate">
                {project.client_name}{project.company_name ? ` · ${project.company_name}` : ''}
              </p>
            )}

            {/* Badges: prioridade + categoria + SLA + etapa atual */}
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium", priority.color)}>
                P{project.priority} · {priority.label}
              </Badge>
              {category && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                  style={{
                    backgroundColor: `${category.color}15`,
                    color: category.color,
                    borderColor: `${category.color}30`,
                  }}
                >
                  {category.name}
                </Badge>
              )}
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

            {/* Tempo estimado + ação */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {project.estimated_time ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {project.estimated_time}
                </Badge>
              ) : <span />}

              {linkToDetail && (
                <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver projeto →
                </span>
              )}
            </div>
          </div>

          {/* Actions Dropdown */}
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
              {linkToDetail && (
                <DropdownMenuItem onClick={() => navigate(`/projetos/${project.id}`)} className="gap-2">
                  <FolderKanban className="w-3.5 h-3.5" />
                  Ver projeto
                </DropdownMenuItem>
              )}
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