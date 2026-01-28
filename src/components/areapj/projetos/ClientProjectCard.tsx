import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, Building2, User, AlertTriangle, 
  CheckCircle2, Circle, Trash2, Edit2
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

const statusConfig = {
  todo: { label: 'A Fazer', color: 'bg-muted text-muted-foreground', icon: Circle },
  progress: { label: 'Em Progresso', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  blocked: { label: 'Bloqueado', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
  done: { label: 'Concluído', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
};

export function ClientProjectCard({ project, tasks, onEdit, onDelete, onClick }: ClientProjectCardProps) {
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const actualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
  
  const priority = priorityConfig[project.priority as keyof typeof priorityConfig] || priorityConfig[3];
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.todo;
  const StatusIcon = status.icon;
  
  // Deadline status
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const isOverdue = deadline && isPast(deadline) && project.status !== 'done';
  const isNearDeadline = deadline && !isPast(deadline) && isWithinInterval(new Date(), {
    start: new Date(),
    end: addDays(deadline, 7)
  });
  
  const getProgressColor = () => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg cursor-pointer group",
        isOverdue && "border-destructive/50",
        isNearDeadline && !isOverdue && "border-yellow-500/50"
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
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
