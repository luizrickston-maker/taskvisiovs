import { useState, useMemo } from 'react';
import { Plus, CheckCircle2, Clock, ListTodo, Trash2, Pen, Filter, Video, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ProjectTaskForm from './ProjectTaskForm';
import SlaChip from './SlaChip';
import { useNavigate } from 'react-router-dom';
import type { ProjectTask, ProjectTaskStatus } from '@/types/database';

const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'P1', color: 'text-priority-critical', bg: 'bg-priority-critical/20' },
  2: { label: 'P2', color: 'text-priority-high', bg: 'bg-priority-high/20' },
  3: { label: 'P3', color: 'text-priority-medium', bg: 'bg-priority-medium/20' },
  4: { label: 'P4', color: 'text-priority-low', bg: 'bg-priority-low/20' },
  5: { label: 'P5', color: 'text-priority-minimal', bg: 'bg-priority-minimal/20' },
};

const statusConfig: Record<ProjectTaskStatus, { label: string; icon: typeof ListTodo; color: string }> = {
  todo: { label: 'A Fazer', icon: ListTodo, color: 'text-muted-foreground' },
  in_progress: { label: 'Em Andamento', icon: Clock, color: 'text-status-scheduled' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-success' },
};

export default function ProjectTasksSection() {
  const { projectTasks, projects, projectStages, deleteProjectTask, updateProjectTask } = useAppStore();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());

  const filteredTasks = useMemo(() => {
    return projectTasks
      .filter(task => {
        if (filterProject !== 'all' && task.project_id !== filterProject) return false;
        if (filterStatus !== 'all' && task.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by priority first, then by status
        if (a.priority !== b.priority) return a.priority - b.priority;
        const statusOrder = { todo: 0, in_progress: 1, done: 2 };
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      });
  }, [projectTasks, filterProject, filterStatus]);

  // Group tasks by stage when filterProject is set and project has stages
  const tasksGroupedByStage = useMemo(() => {
    if (filterProject === 'all') return null;
    const stages = projectStages
      .filter(s => s.project_id === filterProject)
      .sort((a, b) => a.order_index - b.order_index);
    if (stages.length === 0) return null;

    const groups: Array<{ stage: typeof stages[number]; tasks: ProjectTask[] }> = stages.map(stage => ({
      stage,
      tasks: filteredTasks.filter(t => t.stage_id === stage.id),
    }));
    // Adiciona tarefas sem stage como "Sem etapa"
    const unassigned = filteredTasks.filter(t => !t.stage_id);
    if (unassigned.length > 0) {
      groups.push({ stage: null as any, tasks: unassigned });
    }
    return groups;
  }, [filterProject, projectStages, filteredTasks]);

  const toggleStageCollapse = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const getProject = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };

  const handleEdit = (task: ProjectTask) => {
    setEditTask(task);
    setFormOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Erro ao excluir tarefa');
      return;
    }

    deleteProjectTask(taskId);
    toast.success('Tarefa excluída!');
  };

  const handleStatusChange = async (task: ProjectTask, newStatus: ProjectTaskStatus) => {
    const { error } = await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    updateProjectTask(task.id, { status: newStatus });
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditTask(null);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            Tarefas de Projeto
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[160px] h-8">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos projetos</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa encontrada.</p>
            <p className="text-sm">Crie tarefas para gerenciar seus projetos.</p>
          </div>
        ) : tasksGroupedByStage ? (
          // Agrupado por etapa
          <div className="space-y-3">
            {tasksGroupedByStage.map((group) => {
              const stage = group.stage;
              const stageKey = stage?.id || 'unassigned';
              const isCollapsed = collapsedStages.has(stageKey);
              const doneCount = group.tasks.filter(t => t.status === 'done').length;
              const percent = group.tasks.length > 0 ? Math.round((doneCount / group.tasks.length) * 100) : 0;

              return (
                <div key={stageKey} className="rounded-lg border border-border/50 overflow-hidden">
                  {/* Cabeçalho da etapa (accordion) */}
                  <button
                    onClick={() => toggleStageCollapse(stageKey)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">
                      {stage ? `${stage.order_index + 1}. ${stage.name}` : 'Sem etapa'}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {doneCount}/{group.tasks.length}
                    </Badge>
                    <div className="flex-1 mx-2 max-w-32">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    {stage && <SlaChip deadline={stage.deadline} status={stage.status} compact />}
                  </button>

                  {/* Lista de tarefas */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-1.5">
                      {group.tasks.map(task => {
                        const project = getProject(task.project_id);
                        const priorityInfo = priorityConfig[task.priority] || priorityConfig[3];
                        const statusInfo = statusConfig[task.status];
                        const StatusIcon = statusInfo.icon;

                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/40 transition-colors",
                              task.status === 'done' && "opacity-60"
                            )}
                          >
                            <button
                              onClick={() => {
                                const nextStatus: Record<ProjectTaskStatus, ProjectTaskStatus> = {
                                  todo: 'in_progress',
                                  in_progress: 'done',
                                  done: 'todo',
                                };
                                handleStatusChange(task, nextStatus[task.status]);
                              }}
                              className={cn("p-1 rounded hover:bg-muted", statusInfo.color)}
                              title={`Status: ${statusInfo.label}`}
                            >
                              <StatusIcon className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("font-medium text-sm", task.status === 'done' && "line-through")}>
                                  {task.title}
                                </span>
                                <Badge className={cn("text-[10px]", priorityInfo.bg, priorityInfo.color)}>
                                  {priorityInfo.label}
                                </Badge>
                                <SlaChip deadline={task.deadline} status={task.status} />
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => navigate(`/pj/projetos/tarefas/${task.id}/briefing`)}
                                title="Briefing de Vídeo"
                              >
                                <Video className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(task)}
                                title="Editar"
                              >
                                <Pen className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(task.id)}
                                title="Excluir"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {group.tasks.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Nenhuma tarefa nesta etapa
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Sem agrupamento (modo "Todos os projetos")
          <div className="space-y-2">
            {filteredTasks.map(task => {
              const project = getProject(task.project_id);
              const priorityInfo = priorityConfig[task.priority] || priorityConfig[3];
              const statusInfo = statusConfig[task.status];
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors",
                    task.status === 'done' && "opacity-60"
                  )}
                >
                  {/* Status toggle */}
                  <button
                    onClick={() => {
                      const nextStatus: Record<ProjectTaskStatus, ProjectTaskStatus> = {
                        todo: 'in_progress',
                        in_progress: 'done',
                        done: 'todo',
                      };
                      handleStatusChange(task, nextStatus[task.status]);
                    }}
                    className={cn("p-1 rounded hover:bg-muted", statusInfo.color)}
                    title={`Status: ${statusInfo.label}`}
                  >
                    <StatusIcon className="w-5 h-5" />
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium",
                        task.status === 'done' && "line-through"
                      )}>
                        {task.title}
                      </span>
                      <Badge className={cn("text-xs", priorityInfo.bg, priorityInfo.color)}>
                        {priorityInfo.label}
                      </Badge>
                      {project && (
                        <Badge variant="outline" className="text-xs">
                          {project.project}
                        </Badge>
                      )}
                      <SlaChip deadline={task.deadline} status={task.status} />
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => navigate(`/pj/projetos/tarefas/${task.id}/briefing`)}
                      title="Briefing de Vídeo"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(task)}
                      title="Editar"
                    >
                      <Pen className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(task.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <ProjectTaskForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editTask={editTask}
      />
    </Card>
  );
}
