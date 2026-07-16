import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Trash2, CheckCircle2, Clock, ChevronDown, ChevronRight,
  Layers, MoreVertical, Hash, Video,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { computeSla } from '@/lib/sla';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProjectForm from '@/components/projetos/ProjectForm';
import ProjectTaskForm from '@/components/projetos/ProjectTaskForm';
import SlaChip from '@/components/projetos/SlaChip';
import type { ProjectStage, ProjectTask, ProjectStageStatus, ProjectTaskStatus } from '@/types/database';

interface StageFormState {
  name: string;
  sla_days: string;
  deadline: string;
  notes: string;
}

// Cast do supabase para tabelas novas ainda não reconhecidas pelo gerador de tipos
// (project_stages). Quando os tipos forem regenerados, este cast pode sair.
const db = supabase as unknown as {
  from: (table: string) => any;
  auth: typeof supabase.auth;
  rpc: typeof supabase.rpc;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projects, projectTasks, projectStages,
    addProjectStage, updateProjectStage, deleteProjectStage,
    deleteProjectTask, updateProjectTask,
  } = useAppStore();

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string | null>(null);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [editStage, setEditStage] = useState<ProjectStage | null>(null);
  const [stageForm, setStageForm] = useState<StageFormState>({
    name: '', sla_days: '', deadline: '', notes: '',
  });

  const project = useMemo(() => projects.find(p => p.id === id), [projects, id]);

  const stages = useMemo(
    () => projectStages.filter(s => s.project_id === id).sort((a, b) => a.order_index - b.order_index),
    [projectStages, id]
  );

  const tasks = useMemo(
    () => projectTasks.filter(t => t.project_id === id),
    [projectTasks, id]
  );

  // Expandir todas as etapas por padrão
  useEffect(() => {
    setCollapsedStages(new Set());
  }, [id]);

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/projetos')}>
          Voltar para Projetos
        </Button>
      </div>
    );
  }

  // KPIs rápidos
  const totalStages = stages.length;
  const doneStages = stages.filter(s => s.status === 'done').length;
  const overdueStages = stages.filter(s => {
    if (!s.deadline || s.status === 'done') return false;
    return new Date(s.deadline) < new Date();
  }).length;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => {
    if (!t.deadline || t.status === 'done') return false;
    return new Date(t.deadline) < new Date();
  }).length;

  const toggleCollapse = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const openNewStageForm = () => {
    setEditStage(null);
    setStageForm({ name: '', sla_days: '', deadline: '', notes: '' });
    setStageFormOpen(true);
  };

  const openEditStageForm = (stage: ProjectStage) => {
    setEditStage(stage);
    setStageForm({
      name: stage.name,
      sla_days: stage.sla_days?.toString() || '',
      deadline: stage.deadline || '',
      notes: stage.notes || '',
    });
    setStageFormOpen(true);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.name.trim()) {
      toast.error('Nome da etapa é obrigatório');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name: stageForm.name.trim(),
      sla_days: stageForm.sla_days ? Number(stageForm.sla_days) : null,
      deadline: stageForm.deadline || null,
      notes: stageForm.notes.trim() || null,
    };

    if (editStage) {
      const { error } = await db
        .from('project_stages')
        .update(payload)
        .eq('id', editStage.id);
      if (error) {
        toast.error('Erro ao atualizar etapa');
        return;
      }
      updateProjectStage(editStage.id, payload);
      toast.success('Etapa atualizada');
    } else {
      const newOrderIndex = stages.length;
      const { data, error } = await db
        .from('project_stages')
        .insert({
          ...payload,
          project_id: project.id,
          user_id: user.id,
          workspace_id: project.workspace_id,
          order_index: newOrderIndex,
          status: 'todo',
        })
        .select()
        .single();
      if (error || !data) {
        toast.error('Erro ao criar etapa');
        return;
      }
      addProjectStage(data as ProjectStage);
      toast.success('Etapa criada');
    }
    setStageFormOpen(false);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Excluir esta etapa? As tarefas vinculadas ficarão sem etapa.')) return;
    const { error } = await db.from('project_stages').delete().eq('id', stageId);
    if (error) {
      toast.error('Erro ao excluir etapa');
      return;
    }
    deleteProjectStage(stageId);
    toast.success('Etapa excluída');
  };

  const handleStageStatusChange = async (stage: ProjectStage, newStatus: ProjectStageStatus) => {
    const updates: Partial<ProjectStage> = {
      status: newStatus,
      started_at: newStatus === 'in_progress' && !stage.started_at ? new Date().toISOString() : stage.started_at,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    };
    const { error } = await db.from('project_stages').update(updates).eq('id', stage.id);
    if (error) {
      toast.error('Erro ao atualizar etapa');
      return;
    }
    updateProjectStage(stage.id, updates);
    toast.success(`Etapa "${stage.name}" → ${newStatus}`);
  };

  const handleNewTaskInStage = (stageId: string) => {
    setDefaultStageId(stageId);
    setEditTask(null);
    setTaskFormOpen(true);
  };

  const handleTaskStatusChange = async (task: ProjectTask, newStatus: ProjectTaskStatus) => {
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

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) {
      toast.error('Erro ao excluir tarefa');
      return;
    }
    deleteProjectTask(taskId);
    toast.success('Tarefa excluída');
  };

  const renderStageIcon = (iconName: string | null) => {
    if (!iconName) return <Layers className="w-4 h-4" />;
    const Icon = (LucideIcons as any)[iconName];
    if (!Icon) return <Layers className="w-4 h-4" />;
    return <Icon className="w-4 h-4" />;
  };

  const overallProgress = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projetos')}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Projetos
        </Button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{project.project}</h1>
              <Badge variant="outline" className="text-xs">
                {project.priority === 1 ? 'P1 · Crítica' :
                 project.priority === 2 ? 'P2 · Alta' :
                 project.priority === 3 ? 'P3 · Média' :
                 project.priority === 4 ? 'P4 · Baixa' : 'P5 · Mínima'}
              </Badge>
              <SlaChip deadline={project.deadline} status={project.status} />
            </div>
            {(project.client_name || project.company_name) && (
              <p className="text-sm text-muted-foreground">
                {project.client_name}{project.company_name && ` · ${project.company_name}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditProjectOpen(true)} className="gap-1">
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
            <Button size="sm" onClick={() => { setEditTask(null); setDefaultStageId(null); setTaskFormOpen(true); }} className="gap-1">
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs do projeto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Progresso de etapas</p>
            <p className="text-2xl font-bold">{overallProgress}%</p>
            <Progress value={overallProgress} className="h-1 mt-2" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {doneStages}/{totalStages} etapas concluídas
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tarefas</p>
            <p className="text-2xl font-bold">{doneTasks}/{totalTasks}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% concluído
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Etapas atrasadas</p>
            <p className={cn("text-2xl font-bold", overdueStages > 0 ? "text-status-blocked" : "text-muted-foreground")}>
              {overdueStages}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {overdueStages === 0 ? 'Tudo no prazo' : 'Requer atenção'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tarefas atrasadas</p>
            <p className={cn("text-2xl font-bold", overdueTasks > 0 ? "text-status-blocked" : "text-muted-foreground")}>
              {overdueTasks}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {overdueTasks === 0 ? 'Tudo no prazo' : 'Requer atenção'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Etapas / Tarefas (todas) / Arquivos */}
      <Tabs defaultValue="stages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stages" className="gap-1">
            <Layers className="w-4 h-4" />
            Etapas
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Tarefas ({tasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stages" className="space-y-3">
          {stages.length === 0 && tasks.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Projeto sem etapas ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie etapas para organizar o processo do projeto (Briefing → Roteiro → Captação → ...)
                </p>
                <Button onClick={openNewStageForm} className="gap-1">
                  <Plus className="w-4 h-4" />
                  Criar primeira etapa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {stages.map((stage, idx) => {
                const stageTasks = tasks.filter(t => t.stage_id === stage.id);
                const stageDone = stageTasks.filter(t => t.status === 'done').length;
                const stagePercent = stageTasks.length > 0 ? Math.round((stageDone / stageTasks.length) * 100) : 0;
                const isCollapsed = collapsedStages.has(stage.id);
                const sla = computeSla(stage.deadline, stage.status);

                return (
                  <Card key={stage.id} className="overflow-hidden">
                    {/* Cabeçalho da etapa */}
                    <div className={cn("flex items-center gap-3 px-4 py-3 border-l-4",
                      sla.border,
                      stage.status === 'done' && "bg-status-done/5",
                      stage.status === 'in_progress' && "bg-status-progress/5",
                    )}>
                      <button onClick={() => toggleCollapse(stage.id)} className="p-1 hover:bg-muted rounded">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <div className={cn("p-1.5 rounded-lg",
                        stage.status === 'done' && "bg-status-done/20 text-status-done",
                        stage.status === 'in_progress' && "bg-status-progress/20 text-status-progress",
                        stage.status === 'blocked' && "bg-status-blocked/20 text-status-blocked",
                        stage.status === 'todo' && "bg-muted text-muted-foreground",
                      )}>
                        {renderStageIcon(stage.icon)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {idx + 1}. {stage.name}
                          </span>
                          {stage.status === 'in_progress' && <Badge className="bg-status-progress/20 text-status-progress text-[10px]">Em andamento</Badge>}
                          {stage.status === 'done' && <Badge className="bg-status-done/20 text-status-done text-[10px]">Concluído</Badge>}
                          {stage.status === 'blocked' && <Badge className="bg-status-blocked/20 text-status-blocked text-[10px]">Bloqueado</Badge>}
                          <SlaChip deadline={stage.deadline} status={stage.status} />
                        </div>
                        {stageTasks.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 max-w-48">
                              <Progress value={stagePercent} className="h-1" />
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {stageDone}/{stageTasks.length} tarefas
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Ações rápidas de status */}
                      <div className="flex items-center gap-1">
                        {stage.status !== 'in_progress' && stage.status !== 'done' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStageStatusChange(stage, 'in_progress')}
                            className="text-xs h-7"
                          >
                            Iniciar
                          </Button>
                        )}
                        {stage.status === 'in_progress' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStageStatusChange(stage, 'done')}
                            className="text-xs h-7 text-status-done hover:text-status-done"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Concluir
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditStageForm(stage)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" />
                              Editar etapa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNewTaskInStage(stage.id)}>
                              <Plus className="w-3.5 h-3.5 mr-2" />
                              Adicionar tarefa
                            </DropdownMenuItem>
                            {stage.status !== 'in_progress' && (
                              <DropdownMenuItem onClick={() => handleStageStatusChange(stage, 'in_progress')}>
                                <Clock className="w-3.5 h-3.5 mr-2" />
                                Marcar em andamento
                              </DropdownMenuItem>
                            )}
                            {stage.status !== 'blocked' && stage.status !== 'done' && (
                              <DropdownMenuItem onClick={() => handleStageStatusChange(stage, 'blocked')}>
                                Bloquear
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteStage(stage.id)} className="text-destructive">
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir etapa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Lista de tarefas da etapa */}
                    {!isCollapsed && (
                      <div className="p-3 space-y-2 bg-muted/10">
                        {stageTasks.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            Nenhuma tarefa nesta etapa
                          </p>
                        ) : (
                          stageTasks.map(task => (
                            <div
                              key={task.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-md border border-border/40 bg-background hover:bg-muted/40 transition-colors",
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
                                  handleTaskStatusChange(task, nextStatus[task.status]);
                                }}
                                className="p-1 hover:bg-muted rounded"
                                title="Alterar status"
                              >
                                {task.status === 'done' ? (
                                  <CheckCircle2 className="w-4 h-4 text-status-done" />
                                ) : task.status === 'in_progress' ? (
                                  <Clock className="w-4 h-4 text-status-progress" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn("text-sm", task.status === 'done' && "line-through")}>
                                    {task.title}
                                  </span>
                                  <Badge variant="outline" className="text-[10px]">
                                    P{task.priority}
                                  </Badge>
                                  <SlaChip deadline={task.deadline} status={task.status} />
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary"
                                  onClick={() => navigate(`/pj/projetos/tarefas/${task.id}/briefing`)}
                                  title="Briefing de Vídeo"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setEditTask(task); setTaskFormOpen(true); }}
                                  title="Editar"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNewTaskInStage(stage.id)}
                          className="w-full gap-1 text-muted-foreground hover:text-primary"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar tarefa nesta etapa
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}

              <Button
                variant="outline"
                onClick={openNewStageForm}
                className="w-full gap-1"
              >
                <Plus className="w-4 h-4" />
                Nova etapa
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {tasks.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa neste projeto.
                </p>
              </CardContent>
            </Card>
          ) : (
            tasks.map(task => {
              const taskStage = stages.find(s => s.id === task.stage_id);
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/40",
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
                      handleTaskStatusChange(task, nextStatus[task.status]);
                    }}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="w-5 h-5 text-status-done" />
                    ) : task.status === 'in_progress' ? (
                      <Clock className="w-5 h-5 text-status-progress" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/40" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-medium", task.status === 'done' && "line-through")}>
                        {task.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">P{task.priority}</Badge>
                      <SlaChip deadline={task.deadline} status={task.status} />
                      {taskStage && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-primary border-primary/30 bg-primary/5">
                          <Hash className="w-2.5 h-2.5" />
                          {taskStage.name}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { setEditTask(task); setTaskFormOpen(true); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Editar projeto */}
      <ProjectForm
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        editProject={project}
      />

      {/* Form de tarefa (com stage pré-preenchido quando vem de uma etapa) */}
      <ProjectTaskFormWithStage
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        editTask={editTask}
        defaultProjectId={project.id}
        defaultStageId={defaultStageId}
      />

      {/* Form de etapa */}
      <Dialog open={stageFormOpen} onOpenChange={setStageFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editStage ? 'Editar etapa' : 'Nova etapa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStage} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da etapa *</Label>
              <Input
                placeholder="Ex: Briefing, Roteiro, Edição..."
                value={stageForm.name}
                onChange={(e) => setStageForm(s => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>SLA (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 3"
                  value={stageForm.sla_days}
                  onChange={(e) => setStageForm(s => ({ ...s, sla_days: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal text-sm", !stageForm.deadline && "text-muted-foreground")}
                      type="button"
                    >
                      {stageForm.deadline ? (
                        format(parseISO(stageForm.deadline), "dd 'de' MMMM, yyyy", { locale: ptBR })
                      ) : (
                        "Selecione..."
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={stageForm.deadline ? parseISO(stageForm.deadline) : undefined}
                      onSelect={(date) => setStageForm(s => ({ ...s, deadline: date ? format(date, 'yyyy-MM-dd') : '' }))}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Notas do gestor sobre esta etapa..."
                value={stageForm.notes}
                onChange={(e) => setStageForm(s => ({ ...s, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStageFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {editStage ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper do ProjectTaskForm para pré-preencher o stage_id
function ProjectTaskFormWithStage({
  open, onOpenChange, editTask, defaultProjectId, defaultStageId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask: ProjectTask | null;
  defaultProjectId: string;
  defaultStageId: string | null;
}) {
  return (
    <ProjectTaskForm
      open={open}
      onOpenChange={onOpenChange}
      editTask={editTask}
      defaultProjectId={defaultProjectId}
      defaultStageId={defaultStageId}
    />
  );
}