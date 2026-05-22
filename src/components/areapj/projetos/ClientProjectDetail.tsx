import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, Plus, Calendar, Clock, Building2, User, 
  CheckCircle2, Circle, Hourglass, Trash2, Edit2, AlertTriangle, MoreHorizontal, CalendarDays
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Project, ProjectTask, ProjectTaskStatus } from '@/types/database';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ClientTaskForm } from './ClientTaskForm';
import { CreateVideoBriefingButton } from './CreateVideoBriefingButton';
import ProjectCalendar from '@/components/projetos/ProjectCalendar';

interface ClientProjectDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onEdit: () => void;
}

const priorityConfig = {
  1: { label: 'P1', color: 'bg-destructive text-destructive-foreground' },
  2: { label: 'P2', color: 'bg-priority-high text-white' },
  3: { label: 'P3', color: 'bg-priority-medium text-black' },
  4: { label: 'P4', color: 'bg-priority-low text-white' },
  5: { label: 'P5', color: 'bg-muted text-muted-foreground' },
};

const priorityBorderColors = {
  1: 'border-l-4 border-l-priority-critical',
  2: 'border-l-4 border-l-priority-high',
  3: 'border-l-4 border-l-priority-medium',
  4: 'border-l-4 border-l-priority-low',
  5: 'border-l-4 border-l-priority-minimal',
};

const statusConfig = {
  todo: { label: 'A Fazer', color: 'bg-muted text-muted-foreground', icon: Circle },
  progress: { label: 'Em Progresso', color: 'bg-status-progress/20 text-status-progress', icon: Hourglass },
  blocked: { label: 'Bloqueado', color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
  done: { label: 'Concluído', color: 'bg-status-done/20 text-status-done', icon: CheckCircle2 },
};

const taskStatusConfig = {
  todo: { label: 'A Fazer', color: 'bg-muted text-muted-foreground', icon: Circle },
  in_progress: { label: 'Em Andamento', color: 'bg-status-progress/20 text-status-progress', icon: Hourglass },
  done: { label: 'Concluída', color: 'bg-status-done/20 text-status-done', icon: CheckCircle2 },
};

export function ClientProjectDetail({ open, onOpenChange, project, onEdit }: ClientProjectDetailProps) {
  const { projectTasks, updateProjectTask, deleteProjectTask } = useAppStore();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  
  const tasks = useMemo(() => 
    projectTasks.filter(t => t.project_id === project.id),
    [projectTasks, project.id]
  );
  
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const timeStats = useMemo(() => {
    const estimated = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const actual = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    return { estimated, actual, remaining: Math.max(0, estimated - actual) };
  }, [tasks]);
  
  const priority = priorityConfig[project.priority as keyof typeof priorityConfig] || priorityConfig[3];
  const status = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.todo;
  const StatusIcon = status.icon;

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    
    try {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', deletingTaskId);
        
      if (error) throw error;
      
      deleteProjectTask(deletingTaskId);
      toast.success('Tarefa excluída!');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: ProjectTaskStatus) => {
    try {
      const updateData = {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      };
      
      const { error } = await supabase
        .from('project_tasks')
        .update(updateData)
        .eq('id', taskId);
        
      if (error) throw error;
      
      updateProjectTask(taskId, updateData);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error updating task status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const renderTaskCard = (task: ProjectTask) => {
    const taskPriority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig[3];
    const taskPriorityBorder = priorityBorderColors[task.priority as keyof typeof priorityBorderColors] || priorityBorderColors[3];
    const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== 'done';
    
    return (
      <Card key={task.id} className={cn(
        "glass-card transition-all duration-200",
        taskPriorityBorder,
        isOverdue && "border-l-destructive"
      )}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{task.title}</p>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setEditingTask(task);
                  setTaskFormOpen(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeletingTaskId(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={taskPriority.color} variant="secondary">
              {taskPriority.label}
            </Badge>
            {task.deadline_days !== null && task.deadline_days !== undefined && (
              <span className="text-xs flex items-center gap-1 text-primary font-medium">
                <CalendarDays className="w-3 h-3" />
                {task.deadline_days} {task.deadline_days === 1 ? 'dia' : 'dias'}
              </span>
            )}
            {task.deadline && (
              <span className={cn(
                "text-xs flex items-center gap-1",
                isOverdue ? "text-destructive" : "text-muted-foreground"
              )}>
                <Calendar className="w-3 h-3" />
                {format(new Date(task.deadline), "dd/MM", { locale: ptBR })}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.actual_hours || 0}h / {task.estimated_hours || 0}h
            </span>
          </div>
          
          {/* Quick status and briefing buttons */}
          <div className="flex gap-2 flex-wrap items-center">
            <CreateVideoBriefingButton 
              taskId={task.id}
              projectId={project.id}
              clientId={(project as any).client_id || null}
              taskTitle={task.title}
              workspaceId={(project as any).workspace_id || null} 
            />
            
            <div className="flex gap-1">
              {task.status !== 'todo' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => handleQuickStatusChange(task.id, 'todo')}
              >
                <Circle className="w-3 h-3 mr-1" /> A Fazer
              </Button>
            )}
            {task.status !== 'in_progress' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => handleQuickStatusChange(task.id, 'in_progress')}
              >
                <Hourglass className="w-3 h-3 mr-1" /> Em Andamento
              </Button>
            )}
            {task.status !== 'done' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => handleQuickStatusChange(task.id, 'done')}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <DialogTitle className="text-xl">{project.project}</DialogTitle>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
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
              <Button variant="outline" onClick={onEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </DialogHeader>
          
          {/* Project Stats with glass-card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Badge className={priority.color}>{priority.label}</Badge>
                  <Badge className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            {project.deadline && (
              <Card className="glass-card">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Prazo</p>
                  <p className="font-semibold">
                    {format(new Date(project.deadline), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            )}
            
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Progresso</p>
                <p className="font-semibold">{progress}%</p>
                <Progress value={progress} className="h-1 mt-1" />
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Tempo</p>
                <p className="font-semibold text-sm">
                  {timeStats.actual}h / {timeStats.estimated}h
                </p>
                <p className="text-xs text-muted-foreground">
                  Restante: {timeStats.remaining}h
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Tasks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Tarefas ({tasks.length})</h3>
              <Button onClick={() => {
                setEditingTask(null);
                setTaskFormOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
            
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">Todas ({tasks.length})</TabsTrigger>
                <TabsTrigger value="todo">A Fazer ({todoTasks.length})</TabsTrigger>
                <TabsTrigger value="progress">Andamento ({inProgressTasks.length})</TabsTrigger>
                <TabsTrigger value="done">Concluídas ({doneTasks.length})</TabsTrigger>
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-2 mt-4">
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa. Adicione a primeira!
                  </p>
                ) : (
                  tasks.map(renderTaskCard)
                )}
              </TabsContent>
              
              <TabsContent value="todo" className="space-y-2 mt-4">
                {todoTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa a fazer
                  </p>
                ) : (
                  todoTasks.map(renderTaskCard)
                )}
              </TabsContent>
              
              <TabsContent value="progress" className="space-y-2 mt-4">
                {inProgressTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa em andamento
                  </p>
                ) : (
                  inProgressTasks.map(renderTaskCard)
                )}
              </TabsContent>
              
              <TabsContent value="done" className="space-y-2 mt-4">
                {doneTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma tarefa concluída
                  </p>
                ) : (
                  doneTasks.map(renderTaskCard)
                )}
              </TabsContent>
              <TabsContent value="calendar" className="mt-4">
                <ProjectCalendar 
                  tasks={tasks} 
                  onTaskClick={(task) => {
                    setEditingTask(task);
                    setTaskFormOpen(true);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      
      <ClientTaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        projectId={project.id}
        task={editingTask}
      />
      
      <AlertDialog open={!!deletingTaskId} onOpenChange={() => setDeletingTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
