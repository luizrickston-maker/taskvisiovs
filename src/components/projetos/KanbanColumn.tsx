import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Project, ProjectCategory } from '@/types/database';
import ProjectCard from './ProjectCard';
import { useCallback, useRef, useState, type ReactNode } from 'react';

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
  /** Permite customizar a renderização do card (ex: com link para detalhe) */
  renderCard?: (
    project: Project,
    category: ProjectCategory | undefined,
    onEdit: () => void,
    onDelete: () => void,
  ) => ReactNode;
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
  renderCard,
}: KanbanColumnProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (projects.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, projects.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(projects.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < projects.length) {
          onEdit(projects[focusedIndex]);
        }
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < projects.length) {
          onDelete(projects[focusedIndex].id);
        }
        break;
      default:
        break;
    }
  }, [projects, focusedIndex, onEdit, onDelete]);

  const handleFocus = () => {
    if (focusedIndex === -1 && projects.length > 0) {
      setFocusedIndex(0);
    }
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col min-h-[400px] rounded-xl glass-card transition-all duration-200"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="listbox"
      aria-label={`Coluna ${title} com ${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <div className={cn("p-1.5 rounded-lg bg-current/10", color)}>
          <Icon className={cn("w-4 h-4", color)} aria-hidden="true" />
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
              <Icon className={cn("w-6 h-6 opacity-50", color)} aria-hidden="true" />
            </div>
            <p className="text-xs text-muted-foreground">
              Arraste projetos aqui
            </p>
          </div>
        ) : (
          projects.map((project, index) => (
            <div
              key={project.id}
              role="option"
              aria-selected={focusedIndex === index}
              className={cn(
                "rounded-lg transition-all",
                focusedIndex === index && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              {renderCard ? (
                renderCard(
                  project,
                  categories.find(c => c.id === project.project_category_id),
                  () => onEdit(project),
                  () => onDelete(project.id),
                )
              ) : (
                <ProjectCard
                  project={project}
                  category={categories.find(c => c.id === project.project_category_id)}
                  onEdit={() => onEdit(project)}
                  onDelete={() => onDelete(project.id)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
