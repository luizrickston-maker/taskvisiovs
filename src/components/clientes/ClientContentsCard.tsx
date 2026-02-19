import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { FolderOpen, Plus, ExternalLink, Trash2, Loader2, Video, Image, FileText, HardDrive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientContent {
  id: string;
  client_id: string;
  workspace_id: string;
  type: string;
  title: string;
  drive_link: string;
  notes: string | null;
  created_at: string;
}

interface ClientContentsCardProps {
  clientId: string;
  workspaceId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4 text-rose-500" />,
  photo: <Image className="w-4 h-4 text-sky-500" />,
  document: <FileText className="w-4 h-4 text-amber-500" />,
  other: <HardDrive className="w-4 h-4 text-muted-foreground" />,
};

const typeLabels: Record<string, string> = {
  video: 'Vídeo',
  photo: 'Foto',
  document: 'Documento',
  other: 'Outro',
};

function AddContentDialog({
  open,
  onOpenChange,
  clientId,
  workspaceId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ type: 'video', title: '', drive_link: '', notes: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [isLoading, setIsLoading] = useState(false);

  const set = (field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.title.trim()) e.title = 'Título é obrigatório';
    if (!form.drive_link.trim()) e.drive_link = 'Link é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('client_contents').insert({
        client_id: clientId,
        workspace_id: workspaceId,
        type: form.type,
        title: form.title.trim(),
        drive_link: form.drive_link.trim(),
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      toast.success('Conteúdo adicionado!');
      setForm({ type: 'video', title: '', drive_link: '', notes: '' });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao adicionar conteúdo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !isLoading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Conteúdo</DialogTitle>
          <DialogDescription>Adicione um link do Google Drive para este cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">🎬 Vídeo</SelectItem>
                <SelectItem value="photo">🖼️ Foto</SelectItem>
                <SelectItem value="document">📄 Documento</SelectItem>
                <SelectItem value="other">📁 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-title">Título *</Label>
            <Input
              id="ct-title"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Ex: Vídeo apresentação março"
              className={errors.title ? 'border-destructive' : ''}
              maxLength={200}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-link">Link do Google Drive *</Label>
            <Input
              id="ct-link"
              value={form.drive_link}
              onChange={e => set('drive_link', e.target.value)}
              placeholder="https://drive.google.com/..."
              className={errors.drive_link ? 'border-destructive' : ''}
            />
            {errors.drive_link && <p className="text-sm text-destructive">{errors.drive_link}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-notes">Observações</Label>
            <Textarea
              id="ct-notes"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Notas adicionais..."
              rows={2}
              maxLength={500}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ClientContentsCard({ clientId, workspaceId }: ClientContentsCardProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryKey = ['client-contents', clientId];

  const { data: contents = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientContent[];
    },
    enabled: !!clientId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_contents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Conteúdo removido!');
      setDeletingId(null);
    },
    onError: () => toast.error('Erro ao remover conteúdo.'),
  });

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              Conteúdos
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum conteúdo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Adicione links do Google Drive para este cliente.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {contents.map(content => (
                <div
                  key={content.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 group"
                >
                  <div className="shrink-0">
                    {typeIcons[content.type] ?? typeIcons.other}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{content.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{typeLabels[content.type] ?? content.type}</Badge>
                    </div>
                    {content.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{content.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(content.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => window.open(content.drive_link, '_blank')}
                      title="Abrir no Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeletingId(content.id)}
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddContentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        clientId={clientId}
        workspaceId={workspaceId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey })}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              O link será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
