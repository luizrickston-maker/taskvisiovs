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
import { CalendarIcon, Loader2, X, User } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
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
  assigned_to: z.string().uuid().nullable().optional(),
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
  const { addProjectTask, updateProjectTask, corporateTeam } = useAppStore();
  const collaborators = corporateTeam.filter(m => m.member_user_id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    deadline_days: null as number | null,
    priority: 3,
    status: 'todo' as ProjectTaskStatus,
    assigned_to: '' as string,
    estimated_hours: 0,
    actual_hours: 0,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        deadline: task.deadline || '',
        deadline_days: task.deadline_days ?? null,
        priority: task.priority,
        status: task.status,
        assigned_to: task.assigned_to || '',
        estimated_hours: task.estimated_hours || 0,
        actual_hours: task.actual_hours || 0,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        deadline: '',
        deadline_days: null,
        priority: 3,
        status: 'todo',
        assigned_to: '',
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
      toast.error((validation.error as any).errors[0].message);
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
        deadline_days: formData.deadline_days,
        priority: formData.priority,
        status: formData.status,
        assigned_to: formData.assigned_to === 'none' ? null : (formData.assigned_to || null),
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

  // Calculate days count from date range
  const daysCount = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    return differenceInDays(dateRange.to, dateRange.from);
  }, [dateRange]);

  // Apply the date range - use the end date as the deadline
  const handleApplyRange = () => {
    if (!dateRange?.to) return;
    const days = dateRange.from ? differenceInDays(dateRange.to, dateRange.from) : null;
    setFormData(prev => ({ 
      ...prev, 
      deadline: format(dateRange.to!, 'yyyy-MM-dd'),
      deadline_days: days 
    }));
    setDateRange(undefined);
  };

  const clearDeadline = () => {
    setFormData(prev => ({ ...prev, deadline: '', deadline_days: null }));
    setDateRange(undefined);
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
            
            {/* Prazo */}
            <div className="space-y-2">
              <Label>Prazo</Label>
              {/* Período por range de datas */}
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && !formData.deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                              {daysCount !== null && (
                                <span className="ml-2 text-primary font-medium">
                                  ({daysCount} {daysCount === 1 ? 'dia' : 'dias'})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                              <span className="ml-2 text-muted-foreground text-xs">
                                (selecione a data final)
                              </span>
                            </>
                          )
                        ) : formData.deadline ? (
                          <>Prazo: {format(selectedDate!, "dd/MM/yyyy", { locale: ptBR })}</>
                        ) : (
                          "Selecione o período"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      locale={ptBR}
                      numberOfMonths={1}
                      className="pointer-events-auto"
                    />
                    {dateRange?.from && dateRange?.to && (
                      <div className="p-3 pt-0 flex justify-end">
                        <Button size="sm" onClick={handleApplyRange}>
                          Aplicar
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                
                {formData.deadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Prazo definido: {format(selectedDate!, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={clearDeadline}
                      title="Limpar prazo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Atribuir a Colaborador</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_to: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador (opcional)" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="none">Nenhum (Somente eu)</SelectItem>
                  {collaborators.map((member) => (
                    <SelectItem key={member.id} value={member.member_user_id!}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {member.name} ({member.role})
                      </div>
                    </SelectItem>
                  ))}
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
