import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Project, ProjectStatus } from '@/types/database';

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProject?: Project | null;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'todo', label: 'A Fazer' },
  { value: 'progress', label: 'Em Progresso' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'done', label: 'Concluído' },
];

export default function ProjectForm({ open, onOpenChange, editProject }: ProjectFormProps) {
  const { projectCategories, addProject, updateProject } = useAppStore();
  
  const [project, setProject] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [priority, setPriority] = useState('3');
  const [status, setStatus] = useState<ProjectStatus>('todo');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editProject) {
      setProject(editProject.project);
      setCategoryId(editProject.project_category_id || '');
      setPriority(String(editProject.priority));
      setStatus(editProject.status);
      setEstimatedTime(editProject.estimated_time || '');
    } else {
      resetForm();
    }
  }, [editProject, open]);

  const resetForm = () => {
    setProject('');
    setCategoryId('');
    setPriority('3');
    setStatus('todo');
    setEstimatedTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const projectData = {
      task: project.trim(), // Use project name as task for backwards compatibility
      project: project.trim(),
      project_category_id: categoryId || null,
      priority: Number(priority),
      status,
      estimated_time: estimatedTime || null,
    };

    if (editProject) {
      const { error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editProject.id);

      if (error) {
        toast.error('Erro ao atualizar projeto');
        setLoading(false);
        return;
      }

      updateProject(editProject.id, projectData);
      toast.success('Projeto atualizado!');
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...projectData, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao criar projeto');
        setLoading(false);
        return;
      }

      addProject(data as any);
      toast.success('Projeto criado!');
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
            {editProject ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Projeto *</Label>
            <Input
              placeholder="Ex: Website Redesign"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              required
            />
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={categoryId || "none"} 
                onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {projectCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
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

            <div className="space-y-2">
              <Label>Tempo Estimado</Label>
              <Input
                placeholder="Ex: 2h, 30min"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !project.trim()}>
              {editProject ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
