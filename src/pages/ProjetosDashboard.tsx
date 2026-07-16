import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListTodo, Loader2, Ban, CheckCircle2, FolderKanban, LayoutGrid, ClipboardList, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import KanbanColumn from '@/components/projetos/KanbanColumn';
import ProjectCard from '@/components/projetos/ProjectCard';
import ProjectWizard from '@/components/projetos/ProjectWizard';
import CategoryManager from '@/components/projetos/CategoryManager';
import ProjectTasksSection from '@/components/projetos/ProjectTasksSection';
import ProjectCalendar from '@/components/projetos/ProjectCalendar';
import ProjectTaskForm from '@/components/projetos/ProjectTaskForm';
import { computeSla } from '@/lib/sla';
import type { Project, ProjectStatus, ProjectTask } from '@/types/database';

const columns: { status: ProjectStatus; title: string; icon: typeof ListTodo; color: string }[] = [
  { status: 'todo', title: 'A Fazer', icon: ListTodo, color: 'text-primary' },
  { status: 'progress', title: 'Em Progresso', icon: Loader2, color: 'text-warning' },
  { status: 'blocked', title: 'Bloqueado', icon: Ban, color: 'text-destructive' },
  { status: 'done', title: 'Concluído', icon: CheckCircle2, color: 'text-success' },
];

export default function ProjetosDashboard() {
  const navigate = useNavigate();
  const { projects, projectCategories, projectTasks, updateProject, deleteProject } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const total = projects.length;
    const todo = projects.filter(p => p.status === 'todo').length;
    const inProgress = projects.filter(p => p.status === 'progress').length;
    const blocked = projects.filter(p => p.status === 'blocked').length;
    const done = projects.filter(p => p.status === 'done').length;
    const overdue = projects.filter(p => {
      if (p.status === 'done' || !p.deadline) return false;
      return computeSla(p.deadline, p.status).level === 'overdue';
    }).length;
    return { total, todo, inProgress, blocked, done, overdue };
  }, [projects]);

  const handleDrop = async (projectId: string, newStatus: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', projectId);

    if (error) {
      toast.error('Erro ao mover projeto');
      return;
    }

    updateProject(projectId, { status: newStatus as ProjectStatus });
  };

  const handleEdit = (project: Project) => {
    setEditProject(project);
    setFormOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      toast.error('Erro ao excluir projeto');
      return;
    }

    deleteProject(projectId);
    toast.success('Projeto excluído');
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditProject(null);
  };

  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value === 'all' ? null : value);
  };

  // Sort and filter projects
  const sortedProjects = [...projects].sort((a, b) => a.priority - b.priority);
  const filteredProjects = selectedCategory
    ? sortedProjects.filter((p) => p.project_category_id === selectedCategory)
    : sortedProjects;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <FolderKanban className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus projetos e tarefas</p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2 w-full md:w-auto">
          <Plus className="w-4 h-4" />
          Novo Projeto
        </Button>
        <Button variant="outline" onClick={() => navigate('/projetos/minhas-tarefas')} className="gap-2 w-full md:w-auto">
          <ListTodo className="w-4 h-4" />
          Minhas Tarefas
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold">{kpis.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Em Progresso</p>
                <p className="text-2xl font-bold text-status-progress">{kpis.inProgress}</p>
              </div>
              <div className="p-2 rounded-lg bg-status-progress/10">
                <Loader2 className="w-5 h-5 text-status-progress" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("glass-card", kpis.overdue > 0 && "border-status-blocked/40 bg-status-blocked/5")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Atrasados</p>
                <p className={cn("text-2xl font-bold", kpis.overdue > 0 ? "text-status-blocked" : "text-muted-foreground")}>
                  {kpis.overdue}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-status-blocked/10">
                <AlertTriangle className="w-5 h-5 text-status-blocked" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Concluídos</p>
                <p className="text-2xl font-bold text-success">{kpis.done}</p>
              </div>
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Categories */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={selectedCategory || 'all'} onValueChange={handleCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {projectCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  Filtrado
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
            <CategoryManager
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Kanban and Tasks */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="kanban" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Quadro Kanban
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {columns.map((col) => (
              <KanbanColumn
                key={col.status}
                title={col.title}
                status={col.status}
                icon={col.icon}
                color={col.color}
                projects={filteredProjects.filter((p) => p.status === col.status)}
                categories={projectCategories}
                onDrop={handleDrop}
                onEdit={handleEdit}
                onDelete={handleDelete}
                renderCard={(project, category, onEdit, onDelete) => (
                  <ProjectCard
                    project={project}
                    category={category}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    linkToDetail
                  />
                )}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasksSection />
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="glass-card">
            <CardContent className="p-4">
              <ProjectCalendar 
                tasks={projectTasks} 
                onTaskClick={(task) => {
                  setEditTask(task);
                  setTaskFormOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Project Wizard Dialog */}
      <ProjectWizard
        open={formOpen}
        onOpenChange={handleFormClose}
        editProject={editProject}
      />

      {/* Task Form Dialog for Calendar */}
      <ProjectTaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        editTask={editTask}
      />
    </div>
  );
}
