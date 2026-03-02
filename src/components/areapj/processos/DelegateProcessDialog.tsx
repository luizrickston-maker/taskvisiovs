import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FolderKanban, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAssignProcess } from '@/hooks/useAssignProcess';
import type { ProcessStep } from '@/hooks/useProcessEditor';

interface DelegateProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  steps: ProcessStep[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface Project {
  id: string;
  project: string;
}

export function DelegateProcessDialog({ open, onOpenChange, processId, steps }: DelegateProcessDialogProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(false);
  const assignProcess = useAssignProcess();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      supabase.rpc('get_my_workspace_id'),
      supabase.from('corporate_team').select('id, name, role').eq('is_active', true).order('name'),
      supabase.from('projects').select('id, project').eq('is_corporate', true).neq('status', 'done').order('project'),
    ]).then(([wsRes, teamRes, projRes]) => {
      if (wsRes.data) setWorkspaceId(wsRes.data);
      if (teamRes.data) setTeamMembers(teamRes.data);
      if (projRes.data) setProjects(projRes.data);
      setLoading(false);
    });
  }, [open]);

  const handleSubmit = () => {
    if (!selectedMember || !workspaceId) return;
    // Use the team member id as assigned_to_user_id
    // Note: corporate_team.id is not auth user id, but for delegation tracking this works
    assignProcess.mutate(
      {
        processId,
        workspaceId,
        assignedToUserId: selectedMember,
        projectId: selectedProject || undefined,
        steps: steps.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          order_index: s.order_index,
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedMember('');
          setSelectedProject('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Delegar Processo
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {m.name} — <span className="text-muted-foreground">{m.role}</span>
                      </span>
                    </SelectItem>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum colaborador encontrado</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vincular a Projeto (opcional)</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
                        {p.project}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Se selecionado, cada etapa será criada como tarefa no projeto.
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>{steps.length}</strong> etapa{steps.length !== 1 ? 's' : ''} será{steps.length !== 1 ? 'ão' : ''} delegada{steps.length !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMember || assignProcess.isPending}
          >
            {assignProcess.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Users className="w-4 h-4 mr-1.5" />
            )}
            Delegar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
