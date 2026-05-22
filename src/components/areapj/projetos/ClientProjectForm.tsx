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
import type { Project, ProjectStatus } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';

const projectSchema = z.object({
  project: z.string().min(1, 'Nome do projeto é obrigatório').max(200),
  client_name: z.string().max(100).optional(),
  company_name: z.string().max(100).optional(),
  deadline: z.string().optional(),
  priority: z.number().min(1).max(5),
  status: z.enum(['todo', 'progress', 'blocked', 'done']),
});

interface ClientProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  prospectData?: {
    client_name: string;
    company_name?: string;
    prospect_id: string;
  };
}

export function ClientProjectForm({ open, onOpenChange, project, prospectData }: ClientProjectFormProps) {
  const { user } = useAuthContext();
  const { addProject, updateProject } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    project: '',
    client_name: '',
    company_name: '',
    deadline: '',
    priority: 3,
    status: 'todo' as ProjectStatus,
  });

  useEffect(() => {
    if (project) {
      setFormData({
        project: project.project,
        client_name: project.client_name || '',
        company_name: project.company_name || '',
        deadline: project.deadline || '',
        priority: project.priority,
        status: project.status,
      });
    } else if (prospectData) {
      setFormData({
        project: '',
        client_name: prospectData.client_name,
        company_name: prospectData.company_name || '',
        deadline: '',
        priority: 3,
        status: 'todo',
      });
    } else {
      setFormData({
        project: '',
        client_name: '',
        company_name: '',
        deadline: '',
        priority: 3,
        status: 'todo',
      });
    }
  }, [project, prospectData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validation = projectSchema.safeParse(formData);
    if (!validation.success) {
      toast.error((validation.error as any).errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData = {
        user_id: user.id,
        project: formData.project,
        task: formData.project, // Required field, using project name
        client_name: formData.client_name || null,
        company_name: formData.company_name || null,
        deadline: formData.deadline || null,
        priority: formData.priority,
        status: formData.status,
        is_corporate: true,
        prospect_id: prospectData?.prospect_id || project?.prospect_id || null,
      };

      if (project) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', project.id);

        if (error) throw error;
        
        updateProject(project.id, projectData as Partial<Project>);
        toast.success('Projeto atualizado!');
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();

        if (error) throw error;
        
        addProject(data as Project);
        toast.success('Projeto criado!');
      }

      onOpenChange(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving project:', error);
      toast.error('Erro ao salvar projeto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDate = formData.deadline ? new Date(formData.deadline) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto de Cliente'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Nome do Projeto *</Label>
            <Input
              id="project"
              value={formData.project}
              onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
              placeholder="Ex: Website Empresa XYZ"
              maxLength={200}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nome do Cliente</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="João Silva"
                maxLength={100}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_name">Empresa</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="XYZ Ltda"
                maxLength={100}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo de Entrega</Label>
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
                      : "Selecionar data"
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
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as ProjectStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="progress">Em Progresso</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {project ? 'Salvar' : 'Criar Projeto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
