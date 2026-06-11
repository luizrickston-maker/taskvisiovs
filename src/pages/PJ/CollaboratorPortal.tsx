import { useMemo, useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2, Clock, Layout, ListTodo, PlayCircle,
  Loader2, Hourglass, CheckCircle, Sun, Moon, FileText,
  Wifi, WifiOff, CalendarClock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { TaskAttachments } from '@/components/projetos/TaskAttachments';
import { BriefingModal } from '@/components/pj/briefing/BriefingModal';
import { VideoEditingBriefing } from '@/types/video';
import { useCollaboratorPermissions } from '@/hooks/useCollaboratorPermissions';
import { triggerWebhook } from '@/services/webhookService';

const PRIORITY_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: 'Alta',   className: 'bg-red-600' },
  2: { label: 'Média',  className: 'bg-orange-500' },
  3: { label: 'Normal', className: 'bg-blue-600' },
};

function taskIsDone(status: string | null | undefined) {
  return status === 'done' || status === 'completed';
}

export default function CollaboratorPortal() {
  const { user } = useAuthContext();
  const { resolvedTheme, setTheme } = useTheme();
  const {
    projects, projectTasks,
    updateProject, updateProjectTask,
    addProject, addProjectTask,
    deleteProject, deleteProjectTask,
  } = useAppStore();

  const { can } = useCollaboratorPermissions();

  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<VideoEditingBriefing | null>(null);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [tasksWithBriefing, setTasksWithBriefing] = useState<Set<string>>(new Set());
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const collaboratorName: string = (user?.user_metadata?.name as string) ?? user?.email ?? 'Colaborador';

  // ── Workspace do colaborador ────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setWorkspaceId(data.workspace_id); });
  }, [user?.id]);

  // ── Real-time sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`collab-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_tasks' }, (payload: any) => {
        const { eventType, new: n, old: o } = payload;
        if (eventType === 'INSERT') {
          if (!useAppStore.getState().projectTasks.some(t => t.id === n.id)) addProjectTask(n);
        } else if (eventType === 'UPDATE') {
          updateProjectTask(n.id, n);
        } else if (eventType === 'DELETE') {
          deleteProjectTask(o.id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
        const { eventType, new: n, old: o } = payload;
        if (eventType === 'INSERT') {
          if (!useAppStore.getState().projects.some(p => p.id === n.id)) addProject(n);
        } else if (eventType === 'UPDATE') {
          updateProject(n.id, n);
        } else if (eventType === 'DELETE') {
          deleteProject(o.id);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
        else setRealtimeStatus('connecting');
      });
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, addProject, addProjectTask, updateProject, updateProjectTask, deleteProject, deleteProjectTask]);

  // ── Detecta quais tasks têm briefing ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id || projectTasks.length === 0) return;
    const ids = projectTasks.filter(t => t.assigned_to === user.id).map(t => t.id);
    if (ids.length === 0) return;
    supabase
      .from('video_editing_briefings')
      .select('project_task_id')
      .in('project_task_id', ids)
      .then(({ data }) => {
        if (data) setTasksWithBriefing(new Set(data.map(b => b.project_task_id)));
      });
  }, [user?.id, projectTasks]);

  // ── Dados derivados ─────────────────────────────────────────────────────────
  const assignedProjects = useMemo(
    () => projects.filter(p => p.assigned_to === user?.id),
    [projects, user],
  );

  const assignedTasks = useMemo(() => {
    const directTasks = projectTasks.filter(t => t.assigned_to === user?.id);
    const projectIds = assignedProjects.map(p => p.id);
    const fromProjects = projectTasks.filter(
      t => projectIds.includes(t.project_id) && t.assigned_to !== user?.id,
    );
    const combined = [...directTasks];
    fromProjects.forEach(t => { if (!combined.some(e => e.id === t.id)) combined.push(t); });
    return combined;
  }, [projectTasks, assignedProjects, user]);

  const activeTasks    = useMemo(() => assignedTasks.filter(t => !taskIsDone(t.status)), [assignedTasks]);
  const completedTasks = useMemo(() => assignedTasks.filter(t => taskIsDone(t.status)),  [assignedTasks]);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeTasks.filter(t => t.deadline === today);
  }, [activeTasks]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (type: 'project' | 'task', id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from(type === 'project' ? 'projects' : 'project_tasks' as any)
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;

      if (type === 'project') updateProject(id, { status: newStatus });
      else updateProjectTask(id, { status: newStatus });

      toast.success('Status atualizado!');

      // ── WEBHOOK: tarefa concluída ──────────────────────────────────────────
      // Call site pronto. Para ativar: defina WEBHOOK_ENABLED = true em webhookService.ts
      if (type === 'task' && taskIsDone(newStatus) && workspaceId && user?.id) {
        const task = projectTasks.find(t => t.id === id);
        const project = task ? projects.find(p => p.id === task.project_id) : undefined;
        triggerWebhook(workspaceId, {
          event: 'task.completed',
          occurred_at: new Date().toISOString(),
          collaborator: { id: user.id, name: collaboratorName, email: user.email ?? undefined },
          task: {
            id,
            title: task?.title ?? '',
            description: task?.description,
            status: newStatus,
            priority: task?.priority,
            estimated_hours: task?.estimated_hours,
            actual_hours: task?.actual_hours,
            deadline: task?.deadline,
            project_id: task?.project_id ?? '',
            project_name: project?.project,
            client_name: project?.client_name ?? undefined,
          },
        });
      }

    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenBriefing = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('video_editing_briefings').select('*').eq('project_task_id', taskId).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error('Briefing não encontrado.'); return; }
      setSelectedBriefing(data as VideoEditingBriefing);
      setIsBriefingModalOpen(true);
    } catch {
      toast.error('Erro ao carregar briefing.');
    }
  };

  const getProjectProgress = (projectId: string) => {
    const tasks = projectTasks.filter(t => t.project_id === projectId);
    if (tasks.length === 0) return null;
    return Math.round((tasks.filter(t => taskIsDone(t.status)).length / tasks.length) * 100);
  };

  const realtimeIndicator = {
    connected:  { icon: Wifi,    label: 'Ao vivo',       cls: 'bg-green-500/10 text-green-600 border-green-500/20' },
    connecting: { icon: Loader2, label: 'Conectando...', cls: 'bg-muted text-muted-foreground border-border' },
    error:      { icon: WifiOff, label: 'Offline',       cls: 'bg-red-500/10 text-red-500 border-red-500/20' },
  }[realtimeStatus];
  const RealtimeIcon = realtimeIndicator.icon;

  // ── Card de tarefa ativa ────────────────────────────────────────────────────
  const renderActiveTask = (task: typeof activeTasks[0]) => {
    const project     = projects.find(p => p.id === task.project_id);
    const projectName = project?.project ?? 'Sem Projeto';
    const clientName  = project?.client_name ?? '';
    const pc          = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[3];
    const hasBriefing = tasksWithBriefing.has(task.id);

    return (
      <Card key={task.id} className="group overflow-hidden transition-all bg-card border border-border hover:border-primary/40 hover:shadow-md">
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.15em] truncate">
                {clientName ? `${clientName} · ${projectName}` : projectName}
              </p>
              <h3 className="text-lg font-black uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">
                {task.title}
              </h3>
            </div>
            <TaskAttachments taskId={task.id} />
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full text-white', pc.className)}>
              {pc.label}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Clock className="w-3.5 h-3.5" />{task.actual_hours ?? 0}h / {task.estimated_hours ?? 0}h
            </div>
            {task.deadline && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <CalendarClock className="w-3.5 h-3.5" />
                {format(new Date(task.deadline), 'dd MMM', { locale: ptBR })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
            {hasBriefing && can('briefings') && (
              <Button variant="outline" size="sm"
                className="gap-1.5 text-[11px] font-bold uppercase tracking-wider h-9"
                onClick={() => handleOpenBriefing(task.id)}>
                <FileText className="w-3.5 h-3.5" /> Briefing
              </Button>
            )}
            <Button variant="outline" size="sm"
              className={cn('gap-1.5 text-[11px] font-bold uppercase tracking-wider h-9 transition-all',
                task.status === 'in_progress' ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600' : '')}
              onClick={() => handleStatusUpdate('task', task.id, 'in_progress')}
              disabled={updating === task.id || task.status === 'in_progress'}>
              {updating === task.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Hourglass className="w-3.5 h-3.5" />}
              {task.status === 'in_progress' ? 'Em Andamento' : 'Iniciar'}
            </Button>
            <Button variant="outline" size="sm"
              className="gap-1.5 text-[11px] font-bold uppercase tracking-wider h-9 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
              onClick={() => handleStatusUpdate('task', task.id, 'done')}
              disabled={updating === task.id}>
              <CheckCircle className="w-3.5 h-3.5" /> Concluir
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto min-h-screen bg-background text-foreground transition-colors duration-300">
      <BriefingModal briefing={selectedBriefing} isOpen={isBriefingModalOpen} onClose={() => setIsBriefingModalOpen(false)} />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground text-sm">Acompanhe seu progresso e tarefas em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="rounded-full w-10 h-10 border-border">
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border', realtimeIndicator.cls)}>
            <RealtimeIcon className={cn('w-3.5 h-3.5', realtimeStatus === 'connecting' && 'animate-spin')} />
            {realtimeIndicator.label}
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 shrink-0"><ListTodo className="w-5 h-5" /></div>
              <div>
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Ativas</p>
                <p className="text-3xl font-black">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0"><Layout className="w-5 h-5" /></div>
              <div>
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Projetos</p>
                <p className="text-3xl font-black">{assignedProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-500 shrink-0"><CheckCircle2 className="w-5 h-5" /></div>
              <div>
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Concluídas</p>
                <p className="text-3xl font-black">{completedTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Para Hoje */}
      {todayTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <CalendarClock className="w-5 h-5" /> Para Hoje ({todayTasks.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayTasks.map(task => {
              const project = projects.find(p => p.id === task.project_id);
              const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[3];
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
                  <div className={cn('w-2 h-8 rounded-full shrink-0', pc.className)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{task.title}</p>
                    {project && <p className="text-xs text-muted-foreground truncate">{project.project}</p>}
                  </div>
                  <Badge className="bg-amber-500 text-white text-[10px] shrink-0">Hoje</Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Minhas Tarefas */}
      <section className="space-y-4">
        <h2 className="text-xl font-black font-display flex items-center gap-2 uppercase tracking-tight">
          <ListTodo className="w-6 h-6 text-primary" /> Minhas Tarefas
        </h2>

        {assignedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-12 rounded-2xl text-center border border-dashed border-border font-medium">
            Nenhuma tarefa atribuída a você no momento.
          </p>
        ) : (
          <Tabs defaultValue="ativas">
            <TabsList className="mb-4">
              <TabsTrigger value="ativas" className="gap-2">
                Ativas
                {activeTasks.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1.5 rounded-full">
                    {activeTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="concluidas" className="gap-2">
                Concluídas
                {completedTasks.length > 0 && (
                  <Badge className="bg-green-500/20 text-green-600 text-[10px] h-4 px-1.5 rounded-full border-0">
                    {completedTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ativas">
              {activeTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-border bg-muted/20">
                  <CheckCircle2 className="w-10 h-10 text-green-500/60" />
                  <p className="text-sm font-semibold text-muted-foreground">Tudo em dia! Nenhuma tarefa pendente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeTasks.map(renderActiveTask)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="concluidas">
              {completedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted/30 p-12 rounded-2xl text-center border border-dashed border-border">
                  Nenhuma tarefa concluída ainda.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {completedTasks.map(task => {
                    const project = projects.find(p => p.id === task.project_id);
                    return (
                      <Card key={task.id} className="bg-muted/30 border border-border/50">
                        <CardContent className="p-4 flex items-center gap-4">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{task.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {project?.client_name ? `${project.client_name} · ` : ''}{project?.project ?? 'Sem Projeto'}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm"
                            className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 h-7 px-2"
                            onClick={() => handleStatusUpdate('task', task.id, 'todo')}
                            disabled={updating === task.id}>
                            Reabrir
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>

      {/* Projetos */}
      <section className="space-y-5">
        <h2 className="text-xl font-black font-display flex items-center gap-2 uppercase tracking-tight">
          <Layout className="w-6 h-6 text-primary" /> Projetos sob Minha Responsabilidade
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {assignedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted/30 p-12 rounded-2xl text-center md:col-span-3 border border-dashed border-border font-medium">
              Nenhum projeto atribuído diretamente a você.
            </p>
          ) : (
            assignedProjects.map(project => {
              const progress = getProjectProgress(project.id);
              const projDone = project.status === 'done';
              return (
                <Card key={project.id} className={cn('border-border shadow-sm transition-all', projDone && 'opacity-60 grayscale-[0.3]')}>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-base font-bold leading-tight">{project.project}</CardTitle>
                      <Badge className={cn(
                        'text-[10px] uppercase font-bold px-2 py-0.5 rounded-md shrink-0',
                        projDone
                          ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                          : project.status === 'in_progress'
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-muted-foreground border border-border',
                      )}>
                        {projDone ? 'Concluído' : project.status === 'in_progress' ? 'Em Andamento' : 'A Fazer'}
                      </Badge>
                    </div>
                    {project.client_name && (
                      <CardDescription className="text-xs font-medium mt-1">Cliente: {project.client_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 pt-0 space-y-4">
                    {progress !== null && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                          <span>Progresso das tarefas</span>
                          <span className="text-primary">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" size="sm"
                        className={cn('gap-2 font-bold text-[10px] uppercase h-9',
                          project.status === 'in_progress' && 'bg-amber-500/10 border-amber-500/50 text-amber-600')}
                        onClick={() => handleStatusUpdate('project', project.id, project.status === 'in_progress' ? 'todo' : 'in_progress')}
                        disabled={updating === project.id || projDone}>
                        <PlayCircle className={cn('w-4 h-4', project.status === 'in_progress' && 'animate-pulse')} />
                        {project.status === 'in_progress' ? 'Andamento' : 'Iniciar'}
                      </Button>
                      <Button variant="outline" size="sm"
                        className={cn('gap-2 font-bold text-[10px] uppercase h-9',
                          projDone
                            ? 'bg-green-600/10 border-green-500/50 text-green-600'
                            : 'hover:bg-green-600 hover:text-white transition-colors')}
                        onClick={() => handleStatusUpdate('project', project.id, projDone ? 'todo' : 'done')}
                        disabled={updating === project.id}>
                        <CheckCircle2 className="w-4 h-4" />
                        {projDone ? 'Reabrir' : 'Concluir'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}