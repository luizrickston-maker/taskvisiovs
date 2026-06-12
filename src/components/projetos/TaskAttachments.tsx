import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Paperclip, FileUp, Trash2, ExternalLink,
  Loader2, Link2, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  project_task_id: string;
  user_id: string;
}

interface TaskAttachmentsProps {
  taskId: string;
  onUpdate?: () => void;
}

function isLink(att: Attachment) {
  return att.file_type === 'link';
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId, onUpdate }: TaskAttachmentsProps) {
  const { user } = useAuthContext();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_task_attachments')
      .select('*')
      .eq('project_task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
    } else {
      setAttachments((data || []) as Attachment[]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${taskId}/${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_task_attachments')
        .insert({
          project_task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_url: filePath,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success('Arquivo anexado com sucesso!');
      fetchAttachments();
      onUpdate?.();
    } catch (error: any) {
      toast.error('Erro ao anexar arquivo: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !user) return;

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    setSavingLink(true);
    try {
      const { error } = await supabase
        .from('project_task_attachments')
        .insert({
          project_task_id: taskId,
          user_id: user.id,
          file_name: linkLabel.trim() || url,
          file_url: url,
          file_type: 'link',
          file_size: null,
        });

      if (error) throw error;

      toast.success('Link adicionado!');
      setLinkUrl('');
      setLinkLabel('');
      setShowLinkForm(false);
      fetchAttachments();
      onUpdate?.();
    } catch (error: any) {
      toast.error('Erro ao adicionar link: ' + error.message);
    } finally {
      setSavingLink(false);
    }
  };

  const openAttachment = async (att: Attachment) => {
    if (isLink(att)) {
      window.open(att.file_url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const path = att.file_url;
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(path, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Erro ao abrir arquivo');
    }
  };

  const deleteAttachment = async (att: Attachment) => {
    try {
      if (!isLink(att)) {
        await supabase.storage.from('task-attachments').remove([att.file_url]);
      }
      const { error } = await supabase
        .from('project_task_attachments')
        .delete()
        .eq('id', att.id);
      if (error) throw error;
      toast.success('Anexo removido');
      fetchAttachments();
      onUpdate?.();
    } catch {
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

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexos da Tarefa</DialogTitle>
            <DialogDescription>
              Arquivos ou links relacionados a esta tarefa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Toolbar */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <FileUp className="w-4 h-4" />}
                Arquivo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setShowLinkForm(v => !v)}
              >
                <Link2 className="w-4 h-4" />
                Link
              </Button>
            </div>

            {/* Inline link form */}
            {showLinkForm && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">URL *</Label>
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rótulo (opcional)</Label>
                  <Input
                    placeholder="Ex: Drive do projeto, Referência..."
                    value={linkLabel}
                    onChange={e => setLinkLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={handleAddLink}
                    disabled={!linkUrl.trim() || savingLink}
                  >
                    {savingLink
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" />}
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowLinkForm(false); setLinkUrl(''); setLinkLabel(''); }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                  Nenhum anexo ainda. Adicione um arquivo ou link.
                </p>
              ) : (
                attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      {isLink(att)
                        ? <Link2 className="w-4 h-4 shrink-0 text-blue-500" />
                        : <Paperclip className="w-4 h-4 shrink-0 text-primary" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        {isLink(att) ? (
                          <p className="text-xs text-muted-foreground truncate">{att.file_url}</p>
                        ) : att.file_size ? (
                          <p className="text-xs text-muted-foreground">{formatFileSize(att.file_size)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={isLink(att) ? 'Abrir link' : 'Baixar arquivo'}
                        onClick={() => openAttachment(att)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Remover"
                        onClick={() => deleteAttachment(att)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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