import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CreateVideoBriefingButtonProps {
  taskId: string;
  projectId: string;
  clientId?: string | null;
  taskTitle: string;
  workspaceId?: string | null;
}

export function CreateVideoBriefingButton({ 
  taskId, 
  projectId, 
  clientId, 
  taskTitle,
  workspaceId
}: CreateVideoBriefingButtonProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreateBriefing = async () => {
    setIsCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Se não tiver clientId, precisamos buscar do projeto
      let finalClientId = clientId;
      let finalWorkspaceId = workspaceId;
      
      const { data: projectData } = await supabase
        .from('projects' as any)
        .select('*')
        .eq('id', projectId)
        .single();
      
      const castProjectData = projectData as any;
      
      if (!finalWorkspaceId && castProjectData) {
        finalWorkspaceId = castProjectData.workspace_id;
      }

      if (!finalClientId && castProjectData) {
        // Tentativa de achar o cliente pelo nome no projeto
        const { data: clientData } = await supabase
          .from('clients')
          .select('id')
          .eq('name', castProjectData.client_name)
          .limit(1)
          .maybeSingle();
        
        finalClientId = clientData?.id;
      }

      if (!finalClientId) {
        toast.error("Este projeto não está vinculado a um cliente. Vincule um cliente primeiro.");
        setIsCreating(false);
        setOpen(false);
        return;
      }

      // Criar o briefing
      const { data: newBriefing, error } = await supabase
        .from('briefings')
        .insert([{
          title: `Briefing: ${taskTitle}`,
          client_id: finalClientId,
          project_task_id: taskId,
          workspace_id: finalWorkspaceId as string,
          created_by_user_id: userData.user.id,
          status: 'draft' as any,
          briefing_type: 'editing' as any
        } as any])
        .select()
        .single();

      if (error) throw error;

      toast.success("Briefing de edição criado!");
      navigate(`/pj/briefings/${newBriefing.id}/editar`);
    } catch (error: any) {
      console.error('Error creating video briefing:', error);
      toast.error(`Erro ao criar briefing: ${error.message}`);
    } finally {
      setIsCreating(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="h-7 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 border-primary/20"
        onClick={() => setOpen(true)}
      >
        <Video className="w-3.5 h-3.5" />
        Briefing de Edição
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerar Briefing de Edição</DialogTitle>
            <DialogDescription>
              Você deseja criar um novo briefing de edição vinculado a esta tarefa? 
              Isso facilitará a delegação para o editor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-2">
              <p className="text-sm font-semibold text-primary flex items-center gap-2">
                <Video className="w-4 h-4" /> Detalhes do Briefing
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Título: <strong>Briefing: {taskTitle}</strong></p>
                <p>• Tipo: <strong>Edição de Vídeo</strong></p>
                <p>• Vinculado à tarefa atual</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isCreating}>
              Cancelar
            </Button>
            <Button 
              className="gradient-primary glow-primary font-bold" 
              onClick={handleCreateBriefing}
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
              Criar e Editar Agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
