import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssignProcessParams {
  processId: string;
  workspaceId: string;
  assignedToUserId: string;
  projectId?: string;
  steps: { id: string; title: string; description: string | null; order_index: number }[];
}

export function useAssignProcess() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ processId, workspaceId, assignedToUserId, projectId, steps }: AssignProcessParams) => {
      // 1. Create process instance
      const { data: instance, error: instErr } = await supabase
        .from('process_instances')
        .insert({
          process_id: processId,
          workspace_id: workspaceId,
          assigned_to_user_id: assignedToUserId,
          status: 'pending',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (instErr) throw instErr;

      // 2. Create instance steps
      const instanceSteps = steps.map((s) => ({
        process_instance_id: instance.id,
        process_step_id: s.id,
        status: 'pending',
      }));
      const { error: stepsErr } = await supabase
        .from('process_instance_steps')
        .insert(instanceSteps);
      if (stepsErr) throw stepsErr;

      // 3. Optionally create project tasks
      if (projectId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const tasks = steps.map((s) => ({
          project_id: projectId,
          user_id: user.id,
          workspace_id: workspaceId,
          title: s.title,
          description: s.description,
          status: 'todo',
          priority: s.order_index + 1,
          source_process_step_id: s.id,
        }));
        const { error: tasksErr } = await supabase
          .from('project_tasks')
          .insert(tasks);
        if (tasksErr) throw tasksErr;
      }

      return instance;
    },
    onSuccess: () => {
      toast.success('Processo delegado com sucesso!');
      qc.invalidateQueries({ queryKey: ['process-instances'] });
      qc.invalidateQueries({ queryKey: ['project-tasks'] });
    },
    onError: (e) => toast.error('Erro ao delegar processo: ' + e.message),
  });
}
