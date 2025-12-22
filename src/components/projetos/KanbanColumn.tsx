import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectCategory } from '@/types/database';
import ProjectCard from './ProjectCard';

interface KanbanColumnProps {
  title: string;
  status: string;
  icon: LucideIcon;
  color: string;
  projects: Project[];
  categories: ProjectCategory[];
  onDrop: (projectId: string, newStatus: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export default function KanbanColumn({
  title,
  status,
  icon: Icon,
  color,
  projects,
  categories,
  onDrop,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      onDrop(projectId, status);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col min-h-[400px] rounded-xl border border-border/50 bg-secondary/30 transition-all",
        "backdrop-blur-sm"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-2 p-4 border-b border-border/50", color)}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{title}</span>
        <span className="ml-auto text-sm opacity-70">{projects.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 opacity-50">
            Arraste projetos aqui
          </p>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              category={categories.find(c => c.id === project.project_category_id)}
              onEdit={() => onEdit(project)}
              onDelete={() => onDelete(project.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
