import { Clock, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project, ProjectCategory } from '@/types/database';

interface ProjectCardProps {
  project: Project;
  category?: ProjectCategory;
  onEdit: () => void;
  onDelete: () => void;
}

const priorityColors: Record<number, string> = {
  1: 'border-l-red-500',
  2: 'border-l-orange-500',
  3: 'border-l-yellow-500',
  4: 'border-l-blue-500',
  5: 'border-l-gray-500',
};

const priorityLabels: Record<number, string> = {
  1: 'Crítica',
  2: 'Alta',
  3: 'Média',
  4: 'Baixa',
  5: 'Mínima',
};

export default function ProjectCard({ project, category, onEdit, onDelete }: ProjectCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('projectId', project.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-3 rounded-lg bg-card border-l-4 cursor-grab active:cursor-grabbing",
        "hover:shadow-lg transition-all duration-200",
        priorityColors[project.priority] || 'border-l-gray-500'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Project Name */}
          <p className="text-xs font-medium text-primary truncate">
            {project.project}
          </p>
          
          {/* Task */}
          <p className="text-sm font-medium leading-tight">
            {project.task}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category */}
            {category && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ 
                  backgroundColor: `${category.color}20`, 
                  color: category.color 
                }}
              >
                {category.name}
              </span>
            )}

            {/* Priority */}
            <span className="text-muted-foreground">
              P{project.priority} - {priorityLabels[project.priority]}
            </span>

            {/* Estimated Time */}
            {project.estimated_time && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {project.estimated_time}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
