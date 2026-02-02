import { useState, useMemo } from 'react';
import { Plus, ListTodo, Loader2, Ban, CheckCircle2, FolderKanban, LayoutGrid, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import KanbanColumn from '@/components/projetos/KanbanColumn';
import ProjectForm from '@/components/projetos/ProjectForm';
import CategoryManager from '@/components/projetos/CategoryManager';
import ProjectTasksSection from '@/components/projetos/ProjectTasksSection';
import type { Project, ProjectStatus } from '@/types/database';

const columns: { status: ProjectStatus; title: string; icon: typeof ListTodo; color: string }[] = [
  { status: 'todo', title: 'A Fazer', icon: ListTodo, color: 'text-primary' },
  { status: 'progress', title: 'Em Progresso', icon: Loader2, color: 'text-warning' },
  { status: 'blocked', title: 'Bloqueado', icon: Ban, color: 'text-destructive' },
  { status: 'done', title: 'Concluído', icon: CheckCircle2, color: 'text-success' },
];

export default function ProjetosDashboard() {
  const { projects, projectCategories, updateProject, deleteProject } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const total = projects.length;
    const todo = projects.filter(p => p.status === 'todo').length;
    const inProgress = projects.filter(p => p.status === 'progress').length;
    const blocked = projects.filter(p => p.status === 'blocked').length;
    const done = projects.filter(p => p.status === 'done').length;
    return { total, todo, inProgress, blocked, done };
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bloqueados</p>
                <p className="text-2xl font-bold text-destructive">{kpis.blocked}</p>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <Ban className="w-5 h-5 text-destructive" />
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="kanban" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Quadro Kanban
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Tarefas
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
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectTasksSection />
        </TabsContent>
      </Tabs>

      {/* Project Form Dialog */}
      <ProjectForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editProject={editProject}
      />
    </div>
  );
}
