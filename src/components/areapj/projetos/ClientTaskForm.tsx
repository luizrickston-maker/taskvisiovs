import { useState, useEffect, useMemo } from 'react';
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
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
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

  // Use parseISO to correctly interpret 'yyyy-MM-dd' as a local date, not UTC midnight
  const selectedDate = useMemo(() => {
    if (!formData.deadline) return undefined;
    return parseISO(formData.deadline);
  }, [formData.deadline]);

  // Quick period options
  const QUICK_PERIODS = [
    { label: 'Hoje', days: 0 },
    { label: '3 dias', days: 3 },
    { label: '7 dias', days: 7 },
    { label: '15 dias', days: 15 },
    { label: '30 dias', days: 30 },
  ];

  const handleQuickPeriod = (days: number) => {
    const targetDate = addDays(new Date(), days);
    setFormData(prev => ({ ...prev, deadline: format(targetDate, 'yyyy-MM-dd') }));
  };

  const clearDeadline = () => {
    setFormData(prev => ({ ...prev, deadline: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          <form id="client-task-form" onSubmit={handleSubmit} className="space-y-4">
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
            
            {/* Prazo - full width with quick options */}
            <div className="space-y-2">
              <Label>Prazo</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUICK_PERIODS.map((period) => (
                  <Button
                    key={period.days}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleQuickPeriod(period.days)}
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !formData.deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {formData.deadline 
                          ? format(selectedDate!, "dd/MM/yyyy", { locale: ptBR })
                          : "Escolher data específica"
                        }
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
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
                {formData.deadline && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={clearDeadline}
                    title="Limpar prazo"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={String(formData.priority)}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, priority: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="1">P1 - Crítica</SelectItem>
                    <SelectItem value="2">P2 - Alta</SelectItem>
                    <SelectItem value="3">P3 - Média</SelectItem>
                    <SelectItem value="4">P4 - Baixa</SelectItem>
                    <SelectItem value="5">P5 - Mínima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
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
                <SelectContent className="z-[200]">
                  <SelectItem value="todo">A Fazer</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        
        {/* Footer fixo com botões */}
        <div className="flex justify-end gap-2 p-4 pt-2 border-t shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="client-task-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {task ? 'Salvar' : 'Criar Tarefa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
