import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pen, Trash2, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Script, ScriptPlatform, ScriptStatus } from '@/types/database';

const platformLabels: Record<ScriptPlatform, string> = {
  youtube: 'YouTube',
  youtube_shorts: 'Shorts',
  tiktok: 'TikTok',
  tiktok_ads: 'TikTok Ads',
  instagram_reels: 'Reels',
  instagram_post: 'Post',
  instagram_boost: 'Boost',
  facebook_ads: 'FB Ads',
};

const platformColors: Record<ScriptPlatform, string> = {
  youtube: 'bg-red-500/20 text-red-600',
  youtube_shorts: 'bg-red-500/20 text-red-600',
  tiktok: 'bg-slate-800/20 text-slate-700 dark:text-slate-300',
  tiktok_ads: 'bg-slate-800/20 text-slate-700 dark:text-slate-300',
  instagram_reels: 'bg-pink-500/20 text-pink-600',
  instagram_post: 'bg-purple-500/20 text-purple-600',
  instagram_boost: 'bg-orange-500/20 text-orange-600',
  facebook_ads: 'bg-blue-500/20 text-blue-600',
};

const statusLabels: Record<ScriptStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
};

const statusColors: Record<ScriptStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-yellow-500/20 text-yellow-600',
  published: 'bg-green-500/20 text-green-600',
};

interface ScriptListProps {
  onEdit: (script: Script) => void;
  platformFilter?: string;
  statusFilter?: string;
}

export function ScriptList({ onEdit, platformFilter = 'all', statusFilter = 'all' }: ScriptListProps) {
  const { scripts, projectCategories, deleteScript } = useAppStore();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('scripts').delete().eq('id', id);
      if (error) throw error;
      deleteScript(id);
      toast.success('Roteiro excluído!');
    } catch (error) {
      console.error('Error deleting script:', error);
      toast.error('Erro ao excluir roteiro');
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projectCategories.find((pc) => pc.id === projectId);
  };

  const sortedScripts = [...scripts].sort((a, b) => 
    new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
  );

  // Aplicar filtros
  const filteredScripts = sortedScripts.filter(script => {
    const matchesPlatform = platformFilter === 'all' || script.platform === platformFilter;
    const matchesStatus = statusFilter === 'all' || script.status === statusFilter;
    return matchesPlatform && matchesStatus;
  });

  if (scripts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Pen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum roteiro criado ainda.</p>
        <p className="text-sm">Clique em "Novo Roteiro" para começar.</p>
      </div>
    );
  }

  if (filteredScripts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Pen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum roteiro encontrado com os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredScripts.map((script) => {
        const project = getProjectName(script.project_id);
        const wordCount = script.content.trim() ? script.content.trim().split(/\s+/).length : 0;
        
        return (
          <Card key={script.id} className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-medium truncate">{script.title}</h3>
                    <Badge className={platformColors[script.platform]}>
                      {platformLabels[script.platform]}
                    </Badge>
                    <Badge className={statusColors[script.status]}>
                      {statusLabels[script.status]}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {script.content || 'Sem conteúdo'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(script.scheduled_date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                    <span>{wordCount.toLocaleString()} palavras</span>
                    {project && (
                      <span className="flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(script)}
                    className="h-8 w-8"
                    aria-label={`Editar roteiro ${script.title}`}
                  >
                    <Pen className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(script.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Excluir roteiro ${script.title}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
