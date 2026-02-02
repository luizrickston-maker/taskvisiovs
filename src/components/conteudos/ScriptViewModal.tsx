import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Pen, Calendar, FileText, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import type { Script, ScriptPlatform, ScriptStatus } from '@/types/database';

const platformLabels: Record<ScriptPlatform, string> = {
  youtube: 'YouTube',
  youtube_shorts: 'YouTube Shorts',
  tiktok: 'TikTok',
  tiktok_ads: 'TikTok Ads',
  instagram_reels: 'Instagram Reels',
  instagram_post: 'Instagram Post',
  instagram_boost: 'Instagram Boost',
  facebook_ads: 'Facebook Ads',
};

const platformColors: Record<ScriptPlatform, string> = {
  youtube: 'bg-platform-youtube/20 text-platform-youtube',
  youtube_shorts: 'bg-platform-youtube/20 text-platform-youtube',
  tiktok: 'bg-platform-tiktok/20 text-platform-tiktok',
  tiktok_ads: 'bg-platform-tiktok/20 text-platform-tiktok',
  instagram_reels: 'bg-platform-instagram/20 text-platform-instagram',
  instagram_post: 'bg-platform-instagram/20 text-platform-instagram',
  instagram_boost: 'bg-warning/20 text-warning',
  facebook_ads: 'bg-platform-facebook/20 text-platform-facebook',
};

const statusLabels: Record<ScriptStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
};

const statusColors: Record<ScriptStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-status-scheduled/20 text-status-scheduled',
  published: 'bg-status-published/20 text-status-published',
};

interface ScriptViewModalProps {
  script: Script | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScriptViewModal({ script, open, onOpenChange }: ScriptViewModalProps) {
  const navigate = useNavigate();
  const { projects } = useAppStore();

  if (!script) return null;

  const project = script.project_id 
    ? projects.find(p => p.id === script.project_id) 
    : null;

  const wordCount = script.content.trim() ? script.content.trim().split(/\s+/).length : 0;
  const charCount = script.content.length;

  const handleEdit = () => {
    onOpenChange(false);
    navigate('/roteiros', { state: { scriptId: script.id } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="w-5 h-5 text-primary" />
            {script.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 pb-3">
          <Badge className={platformColors[script.platform]}>
            {platformLabels[script.platform]}
          </Badge>
          <Badge className={statusColors[script.status]}>
            {statusLabels[script.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(script.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="w-4 h-4" />
            <span>{wordCount.toLocaleString()} palavras • {charCount.toLocaleString()} caracteres</span>
          </div>
        </div>

        {project && (
          <div className="flex items-center gap-2 text-sm pb-3">
            <span className="text-muted-foreground">Projeto:</span>
            <span className="font-medium">{project.project}</span>
          </div>
        )}

        <Separator />

        <ScrollArea className="flex-1 min-h-0 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {script.content ? (
              <div className="whitespace-pre-wrap">{script.content}</div>
            ) : (
              <p className="text-muted-foreground italic">Sem conteúdo</p>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-2 pt-3 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleEdit} className="gap-2">
            <Pen className="w-4 h-4" />
            Editar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
