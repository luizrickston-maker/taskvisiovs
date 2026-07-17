import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FolderKanban, Plus, Search, Briefcase,
  Clock, CheckCircle2, AlertTriangle, ListTodo, Loader2, Ban,
  LayoutGrid, ClipboardList, Calendar as CalendarIcon,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { computeSla } from '@/lib/sla';
import type { Project } from '@/types/database';
import { ClientProjectCard } from '@/components/areapj/projetos/ClientProjectCard';
import ProjectWizard from '@/components/projetos/ProjectWizard';
import KanbanColumn from '@/components/projetos/KanbanColumn';
import ProjectCalendar from '@/components/projetos/ProjectCalendar';
import { ClientTaskForm } from '@/components/areapj/projetos/ClientTaskForm';
import type { ProjectTask } from '@/types/database';

const columns: { status: string; title: string; icon: typeof ListTodo; color: string }[] = [
  { status: 'todo', title: 'A Fazer', icon: ListTodo, color: 'text-primary' },
  { status: 'progress', title: 'Em Progresso', icon: Loader2, color: 'text-status-progress' },
  { status: 'blocked', title: 'Bloqueado', icon: Ban, color: 'text-status-blocked' },
  { status: 'done', title: 'Concluído', icon: CheckCircle2, color: 'text-status-done' },
];

export default function ProjetosClientesPage() {
  const navigate = useNavigate();
  const { projects, projectTasks, deleteProject, updateProject } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Estado do form de tarefa (para o calendário poder clicar)
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);

  const corporateProjects = useMemo(() =>
    projects.filter(p => p.is_corporate === true),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    return corporateProjects.filter(project => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch =
          project.project.toLowerCase().includes(search) ||
          project.client_name?.toLowerCase().includes(search) ||
          project.company_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && project.priority !== Number(priorityFilter)) return false;
      return true;
    });
  }, [corporateProjects, searchQuery, statusFilter, priorityFilter]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      const statusOrder = { progress: 0, todo: 1, blocked: 2, done: 3 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 99) -
                         (statusOrder[b.status as keyof typeof statusOrder] || 99);
      if (statusDiff !== 0) return statusDiff;
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });
  }, [filteredProjects]);

  const handleDeleteProject = async () => {
    if (!deletingProjectId) return;
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deletingProjectId);
      if (error) throw error;
      deleteProject(deletingProjectId);
      toast.success('Projeto excluído!');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting project:', error);
      toast.error('Erro ao excluir projeto');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleDrop = async (projectId: string, newStatus: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId);
    if (error) {
      toast.error('Erro ao mover projeto');
      return;
    }
    updateProject(projectId, { status: newStatus as Project['status'] });
  };

  const getProjectTasks = (projectId: string) => {
    return projectTasks.filter(t => t.project_id === projectId);
  };

  const stats = useMemo(() => {
    const total = corporateProjects.length;
    const inProgress = corporateProjects.filter(p => p.status === 'progress').length;
    const completed = corporateProjects.filter(p => p.status === 'done').length;
    const overdue = corporateProjects.filter(p => {
      if (!p.deadline || p.status === 'done') return false;
      return computeSla(p.deadline, p.status).level === 'overdue';
    }).length;
    const todo = corporateProjects.filter(p => p.status === 'todo').length;
    return { total, inProgress, completed, overdue, todo };
  }, [corporateProjects]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <FolderKanban className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Projetos de Clientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie projetos e acompanhe o progresso de cada cliente
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Button variant="outline" onClick={() => navigate('/pj/projetos/minhas-tarefas')} className="gap-1">
            <ListTodo className="w-4 h-4" />
            Minhas Tarefas
          </Button>
          <Button onClick={() => {
            setEditingProject(null);
            setWizardOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* KPI Cards (com destaque visual em "Atrasados") */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">A Fazer</p>
                <p className="text-2xl font-bold">{stats.todo}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <FolderKanban className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Em Progresso</p>
                <p className="text-2xl font-bold text-status-progress">{stats.inProgress}</p>
              </div>
              <div className="p-2 rounded-lg bg-status-progress/10">
                <Clock className="w-5 h-5 text-status-progress" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Concluídos</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
              </div>
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("glass-card", stats.overdue > 0 && "border-status-blocked/40 bg-status-blocked/5")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Atrasados</p>
                <p className={cn("text-2xl font-bold",
                  stats.overdue > 0 ? "text-status-blocked" : "text-muted-foreground")}>
                  {stats.overdue}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-status-blocked/10">
                <AlertTriangle className={cn("w-5 h-5",
                  stats.overdue > 0 ? "text-status-blocked" : "text-muted-foreground")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por projeto, cliente ou empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="progress">Em Progresso</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="1">P1 - Crítica</SelectItem>
                <SelectItem value="2">P2 - Alta</SelectItem>
                <SelectItem value="3">P3 - Média</SelectItem>
                <SelectItem value="4">P4 - Baixa</SelectItem>
                <SelectItem value="5">P5 - Mínima</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects: Kanban (default) / Lista / Calendario */}
      {sortedProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
          <p className="text-muted-foreground mt-1">
            {corporateProjects.length === 0
              ? "Crie seu primeiro projeto de cliente"
              : "Tente ajustar os filtros"}
          </p>
          {corporateProjects.length === 0 && (
            <Button
              className="mt-4"
              onClick={() => {
                setEditingProject(null);
                setWizardOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Projeto
            </Button>
          )}
        </div>
      ) : (
        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="lista" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendário
            </TabsTrigger>
          </TabsList>

          {/* KANBAN (default) */}
          <TabsContent value="kanban" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {columns.map((col) => (
                <KanbanColumn
                  key={col.status}
                  title={col.title}
                  status={col.status}
                  icon={col.icon}
                  color={col.color}
                  projects={sortedProjects.filter((p) => p.status === col.status)}
                  categories={[]}
                  onDrop={handleDrop}
                  onEdit={(project) => {
                    setEditingProject(project);
                    setWizardOpen(true);
                  }}
                  onDelete={(projectId) => setDeletingProjectId(projectId)}
                  renderCard={(project, _category, onEdit, onDelete) => (
                    <ClientProjectCard
                      project={project}
                      tasks={getProjectTasks(project.id)}
                      basePath="pj"
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  )}
                />
              ))}
            </div>
          </TabsContent>

          {/* LISTA */}
          <TabsContent value="lista" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedProjects.map(project => (
                <ClientProjectCard
                  key={project.id}
                  project={project}
                  tasks={getProjectTasks(project.id)}
                  basePath="pj"
                  onEdit={() => {
                    setEditingProject(project);
                    setWizardOpen(true);
                  }}
                  onDelete={() => setDeletingProjectId(project.id)}
                />
              ))}
            </div>
          </TabsContent>

          {/* CALENDARIO (mostra tarefas dos projetos PJ com prazo) */}
          <TabsContent value="calendario">
            <Card className="glass-card">
              <CardContent className="p-4">
                <ProjectCalendar
                  tasks={projectTasks.filter(t =>
                    sortedProjects.some(p => p.id === t.project_id)
                  )}
                  onTaskClick={(task) => {
                    setEditingTask(task);
                    setTaskFormOpen(true);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Wizard (substitui o modal único antigo) */}
      <ProjectWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setEditingProject(null);
        }}
        editProject={editingProject}
      />

      {/* Form de tarefa (acionado pelo calendário) */}
      {editingTask && (
        <ClientTaskForm
          open={taskFormOpen}
          onOpenChange={(open) => {
            setTaskFormOpen(open);
            if (!open) setEditingTask(null);
          }}
          projectId={editingTask.project_id || ''}
          task={editingTask}
        />
      )}

      <AlertDialog open={!!deletingProjectId} onOpenChange={() => setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as tarefas do projeto também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
