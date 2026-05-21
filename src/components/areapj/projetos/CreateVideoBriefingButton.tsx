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
import { useNavigate } from 'react-router-dom';
import { VideoEditingBriefingForm } from '../briefings/VideoEditingBriefingForm';

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
  const navigate = useNavigate();

  const handleSuccess = (id: string) => {
    setOpen(false);
    // Redireciona para a página de visualização
    navigate(`/pj/projetos/tarefas/${taskId}/briefing`); 
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Novo Briefing de Edição
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes para orientar o editor na produção deste vídeo.
              Vinculado à tarefa: <strong>{taskTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <VideoEditingBriefingForm 
              clientId={clientId || undefined}
              taskId={taskId}
              workspaceId={workspaceId || undefined}
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
