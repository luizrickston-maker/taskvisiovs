import { CheckCircle2, Circle, Target, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AcoesHoje() {
  const { tasks, updateTask, deleteTask } = useAppStore();
  
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.type === 'today' && t.scheduled_date === today);
  const completedCount = todayTasks.filter(t => t.completed).length;
  const progress = todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0;
  const allCompleted = todayTasks.length > 0 && completedCount === todayTasks.length;

  const handleToggleComplete = async (taskId: string, currentCompleted: boolean) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('tasks')
      .update({ 
        completed: !currentCompleted,
        completed_at: !currentCompleted ? now : null
      })
      .eq('id', taskId);

    if (error) {
      toast.error('Erro ao atualizar tarefa');
      return;
    }

    updateTask(taskId, { 
      completed: !currentCompleted,
      completed_at: !currentCompleted ? now : undefined
    });

    if (!currentCompleted) {
      toast.success('Tarefa concluída!');
    }
  };

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Erro ao excluir tarefa');
      return;
    }

    deleteTask(taskId);
    toast.success('Tarefa excluída');
  };

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary" />
          Ações de Hoje
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {completedCount}/{todayTasks.length} concluídas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progress} 
            className={cn(
              "h-3 transition-all duration-500",
              allCompleted && "animate-pulse"
            )}
          />
          {allCompleted && (
            <div className="flex items-center justify-center gap-2 text-primary animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Parabéns! Dia produtivo!</span>
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {todayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma ação para hoje. Mova tarefas do Inbox!
            </p>
          ) : (
            todayTasks.map((task, index) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all group",
                  task.completed 
                    ? "bg-primary/10 opacity-60" 
                    : "bg-secondary/50 hover:bg-secondary"
                )}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {index + 1}
                </div>
                <button
                  onClick={() => handleToggleComplete(task.id, task.completed)}
                  className="flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                <span className={cn(
                  "flex-1 text-sm transition-all",
                  task.completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Limit Warning */}
        {todayTasks.length >= 5 && !allCompleted && (
          <p className="text-xs text-center text-amber-500">
            Limite de 5 ações atingido. Foco total!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
