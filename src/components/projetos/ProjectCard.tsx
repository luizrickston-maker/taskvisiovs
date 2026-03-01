import { useMemo } from 'react';
import { Clock, GripVertical, Pencil, Trash2, MoreVertical, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import type { Project, ProjectCategory } from '@/types/database';

interface ProjectCardProps {
  project: Project;
  category?: ProjectCategory;
  onEdit: () => void;
  onDelete: () => void;
}

const priorityConfig: Record<number, { label: string; color: string; border: string }> = {
  1: { label: 'Crítica', color: 'text-priority-critical', border: 'border-l-priority-critical' },
  2: { label: 'Alta', color: 'text-priority-high', border: 'border-l-priority-high' },
  3: { label: 'Média', color: 'text-priority-medium', border: 'border-l-priority-medium' },
  4: { label: 'Baixa', color: 'text-priority-low', border: 'border-l-priority-low' },
  5: { label: 'Mínima', color: 'text-priority-minimal', border: 'border-l-priority-minimal' },
};

export default function ProjectCard({ project, category, onEdit, onDelete }: ProjectCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('projectId', project.id);
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
  };

  const priority = priorityConfig[project.priority] || priorityConfig[3];

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-3 rounded-lg bg-background/80 border-l-4 cursor-grab active:cursor-grabbing",
        "hover:shadow-lg hover:bg-background transition-all duration-200",
        "border border-border/50",
        priority.border
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-0.5 flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Project Name */}
          <p className="text-xs font-medium text-primary truncate">
            {project.project}
          </p>
          
          {/* Task */}
          <p className="text-sm font-medium leading-tight line-clamp-2">
            {project.task}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Category */}
            {category && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
                style={{ 
                  backgroundColor: `${category.color}15`, 
                  color: category.color,
                  borderColor: `${category.color}30`
                }}
              >
                {category.name}
              </Badge>
            )}

            {/* Priority */}
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.color)}>
              P{project.priority}
            </Badge>

            {/* Estimated Time */}
            {project.estimated_time && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                {project.estimated_time}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete} 
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
