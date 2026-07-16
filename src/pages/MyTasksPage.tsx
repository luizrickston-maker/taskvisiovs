import { useMemo, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, ListTodo, AlertTriangle, Flame, ChevronDown, ChevronRight,
  Video, Pen, Filter, Layers, PlayCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { computeSla } from '@/lib/sla';
import ProjectTaskForm from '@/components/projetos/ProjectTaskForm';
import SlaChip from '@/components/projetos/SlaChip';
import type { ProjectTask, ProjectTaskStatus } from '@/types/database';

const statusConfig: Record<ProjectTaskStatus, { label: string; icon: typeof ListTodo; color: string }> = {
  todo: { label: 'A Fazer', icon: ListTodo, color: 'text-muted-foreground' },
  in_progress: { label: 'Em Andamento', icon: Clock, color: 'text-status-progress' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'text-status-done' },
};

export default function MyTasksPage() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const {
    projects, projectTasks, projectStages,
    updateProjectTask, deleteProjectTask,
  } = useAppStore();

  const [filterProject, setFilterProject] = useState<string>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  // Tarefas atribuídas ao usuário (direto + via projeto)
  const myTasks = useMemo(() => {
    if (!user?.id) return [];
    const myProjects = projects.filter(p => p.assigned_to === user.id).map(p => p.id);
    return projectTasks
      .filter(t =>
        t.assigned_to === user.id ||
        (t.project_id && myProjects.includes(t.project_id) && !t.assigned_to)
      )
      .filter(t => filterProject === 'all' || t.project_id === filterProject);
  }, [user?.id, projectTasks, projects, filterProject]);

  // Tarefas atrasadas (separadas para destaque)
  const overdueTasks = useMemo(() =>
    myTasks.filter(t => t.status !== 'done' && t.deadline && new Date(t.deadline) < new Date()),
    [myTasks]
  );

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return myTasks.filter(t => t.status !== 'done' && t.deadline === today);
  }, [myTasks]);

  const upcomingTasks = useMemo(() =>
    myTasks.filter(t => t.status !== 'done' && (
      !t.deadline || (new Date(t.deadline) > new Date() && t.deadline !== new Date().toISOString().split('T')[0])
    )),
    [myTasks]
  );

  const doneTasks = myTasks.filter(t => t.status === 'done').length;

  // Agrupar por projeto+etapa
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, { projectId: string; stageId: string | null; tasks: ProjectTask[] }>();
    for (const task of myTasks) {
      const key = `${task.project_id || 'none'}::${task.stage_id || 'none'}`;
      if (!groups.has(key)) {
        groups.set(key, { projectId: task.project_id || 'none', stageId: task.stage_id, tasks: [] });
      }
      groups.get(key)!.tasks.push(task);
    }
    return Array.from(groups.values()).sort((a, b) => {
      // Prio: overdue/today primeiro
      const aHasOverdue = a.tasks.some(t => computeSla(t.deadline, t.status).level === 'overdue');
      const bHasOverdue = b.tasks.some(t => computeSla(t.deadline, t.status).level === 'overdue');
      if (aHasOverdue !== bHasOverdue) return aHasOverdue ? -1 : 1;
      return 0;
    });
  }, [myTasks]);

  const handleToggleStatus = async (task: ProjectTask) => {
    const nextStatus: Record<ProjectTaskStatus, ProjectTaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const newStatus = nextStatus[task.status];
    const updates: Partial<ProjectTask> = {
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('project_tasks').update(updates).eq('id', task.id);
    if (error) {
      toast.error('Erro ao atualizar tarefa');
      return;
    }
    updateProjectTask(task.id, updates);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderTaskRow = (task: ProjectTask) => {
    const statusInfo = statusConfig[task.status];
    const StatusIcon = statusInfo.icon;
    const sla = computeSla(task.deadline, task.status);

    return (
      <div
        key={task.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors",
          task.status === 'done' && "opacity-60",
          sla.level === 'overdue' && "border-status-blocked/40 bg-status-blocked/5",
        )}
      >
        <button
          onClick={() => handleToggleStatus(task)}
          className={cn("p-1 rounded hover:bg-muted", statusInfo.color)}
          title="Alterar status"
        >
          <StatusIcon className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-medium text-sm", task.status === 'done' && "line-through")}>
              {task.title}
            </span>
            <Badge variant="outline" className="text-[10px]">P{task.priority}</Badge>
            <SlaChip deadline={task.deadline} status={task.status} />
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
          onClick={() => navigate(`/pj/projetos/tarefas/${task.id}/briefing`)}
          title="Briefing de Vídeo"
        >
          <Video className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => { setEditTask(task); setTaskFormOpen(true); }}
          title="Editar"
        >
          <Pen className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <ListTodo className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            Foco do dia — atrasos primeiro
          </p>
        </div>
      </div>

      {/* Faixa de HOJE: KPIs diretos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={cn("border", overdueTasks.length > 0 && "border-status-blocked/50 bg-status-blocked/5")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-status-blocked" />
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </div>
            <p className="text-3xl font-bold text-status-blocked mt-1">{overdueTasks.length}</p>
          </CardContent>
        </Card>

        <Card className={cn("border", todayTasks.length > 0 && "border-orange-500/50 bg-orange-500/5")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <p className="text-xs text-muted-foreground">Vencem hoje</p>
            </div>
            <p className="text-3xl font-bold text-orange-500 mt-1">{todayTasks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-status-progress" />
              <p className="text-xs text-muted-foreground">Em andamento</p>
            </div>
            <p className="text-3xl font-bold text-status-progress mt-1">
              {myTasks.filter(t => t.status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-status-done" />
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
            <p className="text-3xl font-bold text-status-done mt-1">{doneTasks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="glass-card">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Projeto:</span>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.project}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de tarefas agrupadas */}
      {myTasks.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">Nenhuma tarefa atribuída a você</p>
            <p className="text-sm text-muted-foreground mt-1">
              Quando o gestor atribuir tarefas, elas aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedTasks.map(group => {
            const project = projects.find(p => p.id === group.projectId);
            const stage = group.stageId ? projectStages.find(s => s.id === group.stageId) : null;
            const groupKey = `${group.projectId}::${group.stageId || 'none'}`;
            const isCollapsed = collapsedGroups.has(groupKey);
            const groupDone = group.tasks.filter(t => t.status === 'done').length;
            const groupOverdue = group.tasks.filter(t =>
              t.status !== 'done' && t.deadline && new Date(t.deadline) < new Date()
            ).length;

            return (
              <Card key={groupKey} className="overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                >
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {stage && <Layers className="w-4 h-4 text-primary" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {project ? project.project : 'Sem projeto'}
                      {stage && <span className="text-muted-foreground font-normal"> · {stage.name}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {groupDone}/{group.tasks.length} concluídas
                    </p>
                  </div>
                  {groupOverdue > 0 && (
                    <Badge variant="outline" className="text-[10px] border-status-blocked/40 text-status-blocked bg-status-blocked/10">
                      ⚠ {groupOverdue} atrasada(s)
                    </Badge>
                  )}
                </button>

                {!isCollapsed && (
                  <CardContent className="pt-0 pb-3 px-3 space-y-1.5">
                    {group.tasks.map(renderTaskRow)}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ProjectTaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        editTask={editTask}
      />
    </div>
  );
}