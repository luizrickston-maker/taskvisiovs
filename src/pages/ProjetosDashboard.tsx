import { useState } from 'react';
import { Plus, ListTodo, Loader2, Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import KanbanColumn from '@/components/projetos/KanbanColumn';
import ProjectForm from '@/components/projetos/ProjectForm';
import CategoryManager from '@/components/projetos/CategoryManager';
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

  // Sort projects by priority
  const sortedProjects = [...projects].sort((a, b) => a.priority - b.priority);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projetos</h1>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col.status}
              title={col.title}
              status={col.status}
              icon={col.icon}
              color={col.color}
              projects={sortedProjects.filter((p) => p.status === col.status)}
              categories={projectCategories}
              onDrop={handleDrop}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Sidebar - Categories */}
        <div className="xl:order-last">
          <CategoryManager />
        </div>
      </div>

      {/* Project Form Dialog */}
      <ProjectForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editProject={editProject}
      />
    </div>
  );
}
