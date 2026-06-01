import { useMemo, useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Circle, Clock, Layout, ListTodo, LogOut, RefreshCcw, 
  PlayCircle, Loader2, Video, Hourglass, CheckCircle, Sun, Moon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { TaskAttachments } from '@/components/projetos/TaskAttachments';

export default function CollaboratorPortal() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { projects, projectTasks, updateProject, updateProjectTask, addProject, addProjectTask, deleteProject, deleteProjectTask } = useAppStore();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Realtime sync — collaborator receives live updates for tasks/projects
  // visible via RLS (assigned_to = me OR project.assigned_to = me)
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, addProject, addProjectTask, updateProject, updateProjectTask, deleteProject, deleteProjectTask]);

  const assignedProjects = useMemo(() => {
    return projects.filter(p => p.assigned_to === user?.id);
  }, [projects, user]);

  const assignedTasks = useMemo(() => {
    // 1. Tarefas atribuídas diretamente ao colaborador
    const directTasks = projectTasks.filter(t => t.assigned_to === user?.id);
    
    // 2. Tarefas de projetos atribuídos ao colaborador
    const projectIds = assignedProjects.map(p => p.id);
    const tasksFromProjects = projectTasks.filter(t => 
      projectIds.includes(t.project_id) && t.assigned_to !== user?.id
    );

    // Combinar (evitando duplicatas se uma tarefa for atribuída e o projeto também)
    const combined = [...directTasks];
    tasksFromProjects.forEach(t => {
      if (!combined.some(existing => existing.id === t.id)) {
        combined.push(t);
      }
    });

    return combined;
  }, [projectTasks, assignedProjects, user]);

  const pendingTasks = useMemo(() => {
    return assignedTasks.filter(t => t.status !== 'done' && t.status !== 'completed');
  }, [assignedTasks]);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return pendingTasks.filter(t => t.deadline === today);
  }, [pendingTasks]);

  const handleStatusUpdate = async (type: 'project' | 'task', id: string, newStatus: string) => {
    setUpdating(id);
    
    try {
      const table = type === 'project' ? 'projects' : 'project_tasks';
      const { error } = await supabase
        .from(table as any)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      if (type === 'project') {
        updateProject(id, { status: newStatus });
      } else {
        updateProjectTask(id, { status: newStatus });
      }

      toast.success('Status atualizado!');
    } catch (error: any) {
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-border">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground text-sm">Acompanhe seu progresso e tarefas em tempo real.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full w-10 h-10 border-border"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-xs font-medium border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Sincronizado
          </div>
        </div>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tarefas Pendentes</p>
                <p className="text-3xl font-black">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-600/10 text-blue-600">
                <Layout className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Projetos Ativos</p>
                <p className="text-3xl font-black">{assignedProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Concluídos (Total)</p>
                <p className="text-3xl font-black">
                  {assignedTasks.filter(t => t.status === 'done' || t.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {/* Tarefas */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black font-display flex items-center gap-2 uppercase tracking-tight">
              <ListTodo className="w-6 h-6 text-primary" /> Minhas Tarefas
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-12 rounded-2xl text-center md:col-span-2 border border-dashed border-border font-medium">
                Nenhuma tarefa atribuída a você no momento.
              </p>
            ) : (
              assignedTasks.map(task => {
                const project = projects.find(p => p.id === task.project_id);
                const projectName = project?.project || 'Sem Projeto';
                const clientName = project?.client_name || '';
                
                return (
                  <Card 
                    key={task.id} 
                    className={cn(
                      "group relative overflow-hidden transition-all duration-300 border-none shadow-xl",
                      theme === 'dark' ? "bg-[#0a0a1a] text-white" : "bg-[#111122] text-white",
                      (task.status === 'done' || task.status === 'completed') && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    <CardContent className="p-6 space-y-5">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5 flex-1">
                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em]">
                            {clientName ? `${clientName} - ${projectName}` : projectName}
                          </p>
                          <h3 className="text-xl font-black uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">
                            {task.title}
                          </h3>
                        </div>
                        <TaskAttachments taskId={task.id} />
                      </div>

                      <p className="text-sm text-gray-400 font-medium leading-relaxed line-clamp-2">
                        {task.description || "Sem descrição informada."}
                      </p>

                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg",
                            task.priority === 1 ? "bg-red-600 shadow-red-900/20" : 
                            task.priority === 2 ? "bg-orange-600 shadow-orange-900/20" : 
                            "bg-blue-600 shadow-blue-900/20"
                          )}>
                            P{task.priority || 3}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-black tracking-wider">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{task.actual_hours || 0}H / {task.estimated_hours || 0}H</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-white/5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20 font-black text-[10px] uppercase tracking-wider h-10 px-4 rounded-lg flex items-center gap-2"
                          onClick={() => navigate(`/pj/projetos/tarefas/${task.id}/briefing`)}
                        >
                          <Video className="w-4 h-4" /> Briefing de Edição
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className={cn(
                            "font-black text-[10px] uppercase tracking-wider h-10 px-4 rounded-lg flex items-center gap-2 transition-all duration-300",
                            task.status === 'in_progress' 
                              ? "bg-amber-600 text-white shadow-lg shadow-amber-900/40" 
                              : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                          )}
                          onClick={() => handleStatusUpdate('task', task.id, 'in_progress')}
                          disabled={updating === task.id || task.status === 'in_progress' || task.status === 'done' || task.status === 'completed'}
                        >
                          <Hourglass className={cn("w-4 h-4", task.status === 'in_progress' && "animate-spin")} />
                          {task.status === 'in_progress' ? 'Em Andamento' : 'Em Andamento'}
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className={cn(
                            "font-black text-[10px] uppercase tracking-wider h-10 px-4 rounded-lg flex items-center gap-2 transition-all duration-300",
                            (task.status === 'done' || task.status === 'completed')
                              ? "bg-green-600 text-white shadow-lg shadow-green-900/40"
                              : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                          )}
                          onClick={() => handleStatusUpdate('task', task.id, 'done')}
                          disabled={updating === task.id || task.status === 'done' || task.status === 'completed'}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Concluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Projetos */}
        <section className="space-y-6">
          <h2 className="text-xl font-black font-display flex items-center gap-2 uppercase tracking-tight">
            <Layout className="w-6 h-6 text-primary" /> Projetos sob Minha Responsabilidade
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-12 rounded-2xl text-center md:col-span-3 border border-dashed border-border font-medium">
                Nenhum projeto atribuído diretamente a você.
              </p>
            ) : (
              assignedProjects.map(project => (
                <Card key={project.id} className={cn(
                  "bg-card border-border shadow-sm hover:shadow-md transition-all overflow-hidden",
                  project.status === 'done' && 'opacity-60 grayscale-[0.3]'
                )}>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-base font-bold truncate">{project.project}</CardTitle>
                      <Badge className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                        project.status === 'done' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                        project.status === 'in_progress' ? 'bg-amber-500 text-white border-none' : 
                        'bg-muted text-muted-foreground border-border'
                      )}>
                        {project.status === 'done' ? 'Concluído' : project.status === 'in_progress' ? 'Em Andamento' : 'A Fazer'}
                      </Badge>
                    </div>
                    {project.client_name && (
                      <CardDescription className="text-xs font-medium">Cliente: {project.client_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 pt-0 space-y-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span>Progresso</span>
                      <span className="text-primary">{project.status === 'done' ? '100%' : 'Ativo'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "gap-2 font-bold text-[10px] uppercase h-9", 
                          project.status === 'in_progress' && "bg-amber-500/10 border-amber-500/50 text-amber-600"
                        )}
                        onClick={() => handleStatusUpdate('project', project.id, project.status === 'in_progress' ? 'todo' : 'in_progress')}
                        disabled={updating === project.id || project.status === 'done'}
                      >
                        <PlayCircle className={cn("w-4 h-4", project.status === 'in_progress' && "animate-pulse")} />
                        {project.status === 'in_progress' ? 'Andamento' : 'Iniciar'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2 font-bold text-[10px] uppercase h-9 hover:bg-green-600 hover:text-white transition-colors"
                        onClick={() => handleStatusUpdate('project', project.id, project.status === 'done' ? 'todo' : 'done')}
                        disabled={updating === project.id}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {project.status === 'done' ? 'Reabrir' : 'Concluir'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
