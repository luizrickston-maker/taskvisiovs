import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Paperclip, FileUp, Download, Trash2, ExternalLink, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TaskAttachmentsProps {
  taskId: string;
  onUpdate?: () => void;
}

export function TaskAttachments({ taskId, onUpdate }: TaskAttachmentsProps) {
  const { user } = useAuthContext();
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_task_attachments')
      .select('*')
      .eq('project_task_id', taskId);
    
    if (error) {
      console.error('Error fetching attachments:', error);
    } else {
      setAttachments(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('project_task_attachments')
        .insert({
          project_task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast.success('Arquivo anexado com sucesso!');
      fetchAttachments();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Erro ao anexar arquivo: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('project_task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
      toast.success('Anexo removido');
      fetchAttachments();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Erro ao remover anexo');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs">
            <Paperclip className="w-3.5 h-3.5" />
            Anexos ({attachments.length})
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexos da Tarefa</DialogTitle>
            <DialogDescription>
              Visualize ou adicione arquivos para esta tarefa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Arquivos</h4>
              <Button 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                Upload
              </Button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                  Nenhum anexo encontrado.
                </p>
              ) : (
                attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-4 h-4 shrink-0 text-primary" />
                      <span className="text-sm truncate font-medium">{att.file_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8" 
                        onClick={() => window.open(att.file_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive" 
                        onClick={() => deleteAttachment(att.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
      />
    </div>
  );
}
