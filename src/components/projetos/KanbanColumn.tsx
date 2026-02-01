import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
    e.currentTarget.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      onDrop(projectId, status);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col min-h-[400px] rounded-xl glass-card transition-all duration-200"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <div className={cn("p-1.5 rounded-lg bg-current/10", color)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <span className="font-semibold text-sm">{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {projects.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={cn("p-3 rounded-full bg-muted/50 mb-3", color)}>
              <Icon className={cn("w-6 h-6 opacity-50", color)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Arraste projetos aqui
            </p>
          </div>
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
