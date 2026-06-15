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
  DialogHeader,
  DialogTitle,
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
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) fetchAttachments();
  }, [taskId, open]);

  const fetchAttachments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_task_attachments')
      .select('*')
      .eq('project_task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching attachments:', error);
    else setAttachments((data || []) as Attachment[]);
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

      toast.success('Arquivo anexado!');
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
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(att.file_url, 60);
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

  const resetLinkForm = () => {
    setShowLinkForm(false);
    setLinkUrl('');
    setLinkLabel('');
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          attachments.length > 0
            ? 'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
            : 'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'
        }
      >
        <Paperclip className="w-3.5 h-3.5 shrink-0" />
        <span>Anexos{attachments.length > 0 ? ` (${attachments.length})` : ''}</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetLinkForm(); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-base font-semibold">Anexos da Tarefa</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Arquivos e links relacionados a esta tarefa.</p>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {/* Ações */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-9 gap-2 text-sm font-medium"
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
                variant={showLinkForm ? 'default' : 'outline'}
                className="flex-1 h-9 gap-2 text-sm font-medium"
                onClick={() => setShowLinkForm(v => !v)}
              >
                <Link2 className="w-4 h-4" />
                Link
              </Button>
            </div>

            {/* Formulário de link */}
            {showLinkForm && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">URL *</Label>
                  <Input
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                    className="h-9 text-sm"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Rótulo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Input
                    placeholder="Ex: Drive do projeto"
                    value={linkLabel}
                    onChange={e => setLinkLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 h-9 gap-1.5"
                    onClick={handleAddLink}
                    disabled={!linkUrl.trim() || savingLink}
                  >
                    {savingLink
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" />}
                    Salvar link
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={resetLinkForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de anexos */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto -mx-1 px-1">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : attachments.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                  <Paperclip className="w-7 h-7 opacity-40" />
                  <p className="text-sm">Nenhum anexo ainda.</p>
                </div>
              ) : (
                attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border border-border hover:bg-muted/70 transition-colors group"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center">
                      {isLink(att)
                        ? <Link2 className="w-4 h-4 text-blue-500" />
                        : <Paperclip className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate leading-tight">{att.file_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">
                        {isLink(att)
                          ? att.file_url.replace(/^https?:\/\//, '').slice(0, 50) + (att.file_url.length > 53 ? '…' : '')
                          : formatFileSize(att.file_size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={isLink(att) ? 'Abrir link' : 'Abrir arquivo'}
                        onClick={() => openAttachment(att)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
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
    </>
  );
}