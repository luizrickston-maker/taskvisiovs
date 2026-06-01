import { useMemo, useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, Layout, ListTodo, LogOut, RefreshCcw, PlayCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function CollaboratorPortal() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { projects, projectTasks, updateProject, updateProjectTask } = useAppStore();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

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
    <div className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold font-display text-foreground">Meu Painel de Trabalho</h1>
          <p className="text-muted-foreground">Bem-vindo! Veja suas pendências e progresso abaixo.</p>
        </div>
      </header>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListTodo className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tarefas Pendentes</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Layout className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Projetos Ativos</p>
                <p className="text-2xl font-bold">{assignedProjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Concluídos (Total)</p>
                <p className="text-2xl font-bold">
                  {assignedTasks.filter(t => t.status === 'done').length + assignedProjects.filter(p => p.status === 'done').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tarefas do Dia */}
        {todayTasks.length > 0 && (
          <section className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold font-display flex items-center gap-2 text-primary">
              <Clock className="w-5 h-5" /> Para Fazer Hoje
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayTasks.map(task => (
                <Card key={task.id} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'in_progress' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-amber-500 hover:text-amber-600 hover:bg-amber-100"
                          onClick={() => handleStatusUpdate('task', task.id, 'done')}
                          disabled={updating === task.id}
                        >
                          <PlayCircle className="w-6 h-6 animate-pulse" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusUpdate('task', task.id, 'in_progress')}
                          disabled={updating === task.id || task.status === 'done'}
                        >
                          <Circle className="w-6 h-6 text-primary" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{task.title}</h3>
                        {task.status === 'in_progress' && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">Em Andamento</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Tarefas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <ListTodo className="w-5 h-5" /> Minhas Tarefas
            </h2>
          </div>

          <div className="space-y-6">
            {assignedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-8 rounded-xl text-center">
                Nenhuma tarefa atribuída a você no momento.
              </p>
            ) : (
              // Agrupar tarefas por projeto
              Object.entries(
                assignedTasks.reduce((acc, task) => {
                  const projectName = projects.find(p => p.id === task.project_id)?.project || 'Sem Projeto';
                  if (!acc[projectName]) acc[projectName] = [];
                  acc[projectName].push(task);
                  return acc;
                }, {} as Record<string, typeof assignedTasks>)
              ).map(([projectName, tasks]) => (
                <div key={projectName} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground px-1">{projectName}</h3>
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <Card key={task.id} className={task.status === 'done' ? 'opacity-60 border-green-500/20' : task.status === 'in_progress' ? 'border-amber-500/30 bg-amber-500/5' : ''}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="flex items-center gap-2 shrink-0">
                            {updating === task.id ? (
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            ) : task.status === 'done' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStatusUpdate('task', task.id, 'todo')}
                              >
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              </Button>
                            ) : task.status === 'in_progress' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-amber-500 hover:text-amber-600"
                                onClick={() => handleStatusUpdate('task', task.id, 'done')}
                              >
                                <PlayCircle className="w-6 h-6 animate-pulse" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-amber-500"
                                onClick={() => handleStatusUpdate('task', task.id, 'in_progress')}
                              >
                                <Circle className="w-6 h-6" />
                              </Button>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={task.status === 'done' ? 'line-through font-medium' : 'font-medium'}>
                                {task.title}
                              </h3>
                              {task.status === 'in_progress' && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">Andamento</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {task.deadline && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(task.deadline), "dd MMM", { locale: ptBR })}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px]">P{task.priority}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Projetos */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Layout className="w-5 h-5" /> Projetos sob Minha Responsabilidade
          </h2>

          <div className="space-y-4">
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-8 rounded-xl text-center">
                Nenhum projeto atribuído diretamente a você.
              </p>
            ) : (
              assignedProjects.map(project => (
                <Card key={project.id} className={project.status === 'done' ? 'opacity-60 border-green-500/20' : project.status === 'in_progress' ? 'border-amber-500/30 bg-amber-500/5' : ''}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.project}</CardTitle>
                      <Badge variant={project.status === 'done' ? 'secondary' : project.status === 'in_progress' ? 'default' : 'outline'} className={project.status === 'in_progress' ? 'bg-amber-500 text-white border-none' : ''}>
                        {project.status === 'done' ? 'Concluído' : project.status === 'in_progress' ? 'Em Andamento' : 'A Fazer'}
                      </Badge>
                    </div>
                    {project.client_name && (
                      <CardDescription>Cliente: {project.client_name}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Progresso do Projeto</span>
                      <span>{project.status === 'done' ? '100%' : 'Em desenvolvimento'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={cn("gap-2", project.status === 'in_progress' && "bg-amber-500/10 border-amber-500 text-amber-700")}
                        onClick={() => handleStatusUpdate('project', project.id, project.status === 'in_progress' ? 'todo' : 'in_progress')}
                        disabled={updating === project.id || project.status === 'done'}
                      >
                        <PlayCircle className={cn("w-4 h-4", project.status === 'in_progress' && "animate-pulse")} />
                        {project.status === 'in_progress' ? 'Em Andamento' : 'Iniciar'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2 hover:bg-green-500 hover:text-white"
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
