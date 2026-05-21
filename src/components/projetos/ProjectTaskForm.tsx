import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectTask, ProjectTaskStatus } from '@/types/database';

interface ProjectTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask?: ProjectTask | null;
}

const statusOptions: { value: ProjectTaskStatus; label: string }[] = [
  { value: 'todo', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'done', label: 'Concluído' },
];

const priorityOptions = [
  { value: '1', label: 'P1 - Crítica', color: 'text-priority-critical' },
  { value: '2', label: 'P2 - Alta', color: 'text-priority-high' },
  { value: '3', label: 'P3 - Média', color: 'text-priority-medium' },
  { value: '4', label: 'P4 - Baixa', color: 'text-priority-low' },
  { value: '5', label: 'P5 - Mínima', color: 'text-priority-minimal' },
];

export default function ProjectTaskForm({ open, onOpenChange, editTask }: ProjectTaskFormProps) {
  const { projects, addProjectTask, updateProjectTask } = useAppStore();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState('3');
  const [status, setStatus] = useState<ProjectTaskStatus>('todo');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setProjectId(editTask.project_id || '');
      setPriority(String(editTask.priority));
      setStatus(editTask.status);
    } else {
      resetForm();
    }
  }, [editTask, open]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('3');
    setStatus('todo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      priority: Number(priority),
      status,
    };

    if (editTask) {
      const { error } = await supabase
        .from('project_tasks')
        .update(taskData)
        .eq('id', editTask.id);

      if (error) {
        toast.error('Erro ao atualizar tarefa');
        setLoading(false);
        return;
      }

      updateProjectTask(editTask.id, taskData);
      toast.success('Tarefa atualizada!');
    } else {
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({ ...taskData, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao criar tarefa');
        setLoading(false);
        return;
      }

      addProjectTask(data as ProjectTask);
      toast.success('Tarefa criada!');
    }

    setLoading(false);
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              placeholder="Ex: Implementar autenticação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva os detalhes da tarefa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select 
              value={projectId || "none"} 
              onValueChange={(v) => setProjectId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum projeto</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectTaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {editTask && (
              <Button 
                type="button" 
                variant="secondary" 
                className="w-full gap-2"
                onClick={() => navigate(`/pj/projetos/tarefas/${editTask.id}/briefing`)}
              >
                <Video className="w-4 h-4" />
                Gerenciar Briefing de Vídeo
              </Button>
            )}
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !title.trim()}>
                {editTask ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
