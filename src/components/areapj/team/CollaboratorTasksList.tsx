import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Tag } from 'lucide-react';
import type { ProjectTask, Project } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CollaboratorTasksListProps {
  tasks: ProjectTask[];
  projects: Project[];
}

export function CollaboratorTasksList({ tasks, projects }: CollaboratorTasksListProps) {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Priority (higher first) then deadline
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks]);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Sem Projeto';
    return projects.find(p => p.id === projectId)?.project || 'Projeto não encontrado';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'done':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Em Andamento</Badge>;
      default:
        return <Badge variant="outline">A Fazer</Badge>;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">Nenhuma atividade encontrada para este colaborador.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-3">
        {sortedTasks.map((task) => (
          <Card key={task.id} className="hover:border-primary/50 transition-colors shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm leading-none">{task.title}</h4>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>{getProjectName(task.project_id)}</span>
                    </div>
                    {task.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(task.deadline), "dd 'de' MMM", { locale: ptBR })}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {task.description && (
                   <p className="text-xs text-muted-foreground line-clamp-1 max-w-md hidden md:block">
                     {task.description}
                   </p>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    P{task.priority}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
