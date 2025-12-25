import { useState } from 'react';
import { Plus, ListTodo, Loader2, Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  { status: 'todo', title: 'A Fazer', icon: ListTodo, color: 'text-blue-400' },
  { status: 'progress', title: 'Em Progresso', icon: Loader2, color: 'text-amber-400' },
  { status: 'blocked', title: 'Bloqueado', icon: Ban, color: 'text-red-400' },
  { status: 'done', title: 'Concluído', icon: CheckCircle2, color: 'text-emerald-400' },
];

export default function ProjetosDashboard() {
  const { projects, projectCategories, updateProject, deleteProject } = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Sort and filter projects
  const sortedProjects = [...projects].sort((a, b) => a.priority - b.priority);
  const filteredProjects = selectedCategory
    ? sortedProjects.filter((p) => p.project_category_id === selectedCategory)
    : sortedProjects;

  const handleCategoryFilter = (value: string) => {
    setSelectedCategory(value === 'all' ? null : value);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <div className="flex items-center gap-3">
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
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Categories - Horizontal Bar */}
      <CategoryManager
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Kanban Board - Full Width */}
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

      {/* Project Tasks Section */}
      <ProjectTasksSection />

      {/* Project Form Dialog */}
      <ProjectForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editProject={editProject}
      />
    </div>
  );
}
