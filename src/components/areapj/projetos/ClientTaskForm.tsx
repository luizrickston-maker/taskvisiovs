import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import type { ProjectTask, ProjectTaskStatus } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';

const taskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(500).optional(),
  deadline: z.string().optional(),
  priority: z.number().min(1).max(5),
  status: z.enum(['todo', 'in_progress', 'done']),
  estimated_hours: z.number().min(0).max(9999),
  actual_hours: z.number().min(0).max(9999),
});

interface ClientTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: ProjectTask | null;
}

export function ClientTaskForm({ open, onOpenChange, projectId, task }: ClientTaskFormProps) {
  const { user } = useAuthContext();
  const { addProjectTask, updateProjectTask } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    priority: 3,
    status: 'todo' as ProjectTaskStatus,
    estimated_hours: 0,
    actual_hours: 0,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        deadline: task.deadline || '',
        priority: task.priority,
        status: task.status,
        estimated_hours: task.estimated_hours || 0,
        actual_hours: task.actual_hours || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        deadline: '',
        priority: 3,
        status: 'todo',
        estimated_hours: 0,
        actual_hours: 0,
      });
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validation = taskSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const taskData = {
        user_id: user.id,
        project_id: projectId,
        title: formData.title,
        description: formData.description || null,
        deadline: formData.deadline || null,
        priority: formData.priority,
        status: formData.status,
        estimated_hours: formData.estimated_hours,
        actual_hours: formData.actual_hours,
        completed_at: formData.status === 'done' ? new Date().toISOString() : null,
      };

      if (task) {
        const { error } = await supabase
          .from('project_tasks')
          .update(taskData)
          .eq('id', task.id);

        if (error) throw error;
        
        updateProjectTask(task.id, taskData as Partial<ProjectTask>);
        toast.success('Tarefa atualizada!');
      } else {
        const { data, error } = await supabase
          .from('project_tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;
        
        addProjectTask(data as ProjectTask);
        toast.success('Tarefa criada!');
      }

      onOpenChange(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving task:', error);
      toast.error('Erro ao salvar tarefa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDate = formData.deadline ? new Date(formData.deadline) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Desenvolver homepage"
              maxLength={200}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detalhes da tarefa..."
              maxLength={500}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.deadline 
                      ? format(new Date(formData.deadline), "dd/MM/yyyy", { locale: ptBR })
                      : "Selecionar"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setFormData(prev => ({ 
                      ...prev, 
                      deadline: date ? format(date, 'yyyy-MM-dd') : '' 
                    }))}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={String(formData.priority)}
                onValueChange={(v) => setFormData(prev => ({ ...prev, priority: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">P1 - Crítica</SelectItem>
                  <SelectItem value="2">P2 - Alta</SelectItem>
                  <SelectItem value="3">P3 - Média</SelectItem>
                  <SelectItem value="4">P4 - Baixa</SelectItem>
                  <SelectItem value="5">P5 - Mínima</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Horas Estimadas</Label>
              <Input
                id="estimated_hours"
                type="number"
                min={0}
                max={9999}
                step={0.5}
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actual_hours">Horas Executadas</Label>
              <Input
                id="actual_hours"
                type="number"
                min={0}
                max={9999}
                step={0.5}
                value={formData.actual_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: Number(e.target.value) }))}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as ProjectTaskStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="done">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {task ? 'Salvar' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
