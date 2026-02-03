import { useState } from 'react';
import { Inbox, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function InboxMental() {
  const [newTask, setNewTask] = useState('');
  const { tasks, addTask, updateTask, deleteTask } = useAppStore();
  
  const inboxTasks = tasks.filter(t => t.type === 'inbox' && !t.completed);
  const todayTasks = tasks.filter(t => t.type === 'today' && !t.completed);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newTask.trim(),
        type: 'inbox',
        completed: false
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao adicionar tarefa');
      return;
    }

    addTask(data as any);
    setNewTask('');
    toast.success('Tarefa adicionada ao inbox');
  };

  const handleMoveToToday = async (taskId: string) => {
    // Aviso suave em vez de bloqueio
    if (todayTasks.length >= 5) {
      toast.info('Você já tem 5+ ações hoje. Considere priorizar!');
    }

    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('tasks')
      .update({ type: 'today', scheduled_date: today })
      .eq('id', taskId);

    if (error) {
      toast.error('Erro ao mover tarefa');
      return;
    }

    updateTask(taskId, { type: 'today', scheduled_date: today });
    toast.success('Movido para Ações de Hoje');
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
  };

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5 text-primary" />
          Inbox Mental
          {inboxTasks.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {inboxTasks.length} pendente{inboxTasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddTask} className="flex gap-2">
          <Input
            placeholder="Capturar pensamento..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newTask.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {inboxTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Inbox vazio. Capture seus pensamentos!
            </p>
          ) : (
            inboxTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <span className="flex-1 text-sm">{task.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleMoveToToday(task.id)}
                  title="Mover para Ações de Hoje"
                >
                  <ArrowRight className="w-4 h-4 text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
