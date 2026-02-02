import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, Clock, Building2, User, AlertTriangle, 
  CheckCircle2, Circle, MoreHorizontal, Trash2, Edit2, Hourglass
} from 'lucide-react';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Project, ProjectTask } from '@/types/database';
import { cn } from '@/lib/utils';

interface ClientProjectCardProps {
  project: Project;
  tasks: ProjectTask[];
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

const priorityConfig = {
  1: { label: 'P1', color: 'bg-destructive text-destructive-foreground' },
  2: { label: 'P2', color: 'bg-orange-500 text-white' },
  3: { label: 'P3', color: 'bg-yellow-500 text-black' },
  4: { label: 'P4', color: 'bg-blue-500 text-white' },
  5: { label: 'P5', color: 'bg-muted text-muted-foreground' },
};

const priorityBorderColors = {
  1: 'border-l-4 border-l-red-500',
  2: 'border-l-4 border-l-orange-500',
  3: 'border-l-4 border-l-yellow-500',
  4: 'border-l-4 border-l-blue-500',
  5: 'border-l-4 border-l-gray-400',
};

const statusConfig = {
  todo: { label: 'A Fazer', color: 'bg-muted text-muted-foreground', icon: Circle },
  progress: { label: 'Em Progresso', color: 'bg-primary/20 text-primary', icon: Hourglass },
  blocked: { label: 'Bloqueado', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
  done: { label: 'Concluído', color: 'bg-success/20 text-success', icon: CheckCircle2 },
};

export function ClientProjectCard({ project, tasks, onEdit, onDelete, onClick }: ClientProjectCardProps) {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const actualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
  
  const priority = priorityConfig[project.priority as keyof typeof priorityConfig] || priorityConfig[3];
  const priorityBorder = priorityBorderColors[project.priority as keyof typeof priorityBorderColors] || priorityBorderColors[3];
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.todo;
  const StatusIcon = status.icon;
  
  // Deadline status
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const isOverdue = deadline && isPast(deadline) && project.status !== 'done';
  const isNearDeadline = deadline && !isPast(deadline) && isWithinInterval(new Date(), {
    start: new Date(),
    end: addDays(deadline, 7)
  });

  return (
    <Card 
      className={cn(
        "glass-card transition-all duration-200 hover:shadow-lg cursor-pointer",
        priorityBorder,
        isOverdue && "border-l-destructive",
        isNearDeadline && !isOverdue && "border-l-yellow-500"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{project.project}</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {project.client_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {project.client_name}
                </span>
              )}
              {project.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {project.company_name}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={priority.color}>{priority.label}</Badge>
          <Badge className={status.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>
        
        {deadline && (
          <div className={cn(
            "flex items-center gap-2 text-sm",
            isOverdue ? "text-destructive" : isNearDeadline ? "text-yellow-500" : "text-muted-foreground"
          )}>
            <Calendar className="w-4 h-4" />
            <span>
              {isOverdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
              Prazo: {format(deadline, "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        )}
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedTasks}/{totalTasks} tarefas</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {actualHours}h / {estimatedHours}h
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
