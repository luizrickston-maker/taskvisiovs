import { useMemo } from 'react';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Pen, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
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
  youtube: 'bg-platform-youtube/20 text-platform-youtube',
  youtube_shorts: 'bg-platform-youtube/20 text-platform-youtube',
  tiktok: 'bg-platform-tiktok/20 text-platform-tiktok',
  tiktok_ads: 'bg-platform-tiktok/20 text-platform-tiktok',
  instagram_reels: 'bg-platform-instagram/20 text-platform-instagram',
  instagram_post: 'bg-platform-instagram/20 text-platform-instagram',
  instagram_boost: 'bg-warning/20 text-warning',
  facebook_ads: 'bg-platform-facebook/20 text-platform-facebook',
};

const statusColors: Record<ScriptStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-status-scheduled/20 text-status-scheduled',
  published: 'bg-status-published/20 text-status-published',
};

const statusLabels: Record<ScriptStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
};

interface ContentTimelineProps {
  onSelectScript: (script: Script) => void;
  platformFilter: string;
  statusFilter: string;
}

export function ContentTimeline({ onSelectScript, platformFilter, statusFilter }: ContentTimelineProps) {
  const { scripts, projectCategories } = useAppStore();

  const filteredScripts = useMemo(() => {
    return scripts
      .filter(script => {
        if (platformFilter !== 'all' && script.platform !== platformFilter) return false;
        if (statusFilter !== 'all' && script.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
  }, [scripts, platformFilter, statusFilter]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Script[]> = {};
    filteredScripts.forEach(script => {
      const dateKey = script.scheduled_date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(script);
    });
    return groups;
  }, [filteredScripts]);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  const getProject = (projectId: string | null) => {
    if (!projectId) return null;
    return projectCategories.find(pc => pc.id === projectId);
  };

  if (filteredScripts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum conteúdo encontrado.</p>
        <p className="text-sm">Crie roteiros na aba Roteiros para visualizá-los aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([dateStr, dayScripts]) => {
        const date = new Date(dateStr);
        const isDatePast = isPast(date) && !isToday(date);
        
        return (
          <div key={dateStr} className="relative">
            {/* Date Header */}
            <div className={cn(
              "sticky top-0 z-10 py-2 px-3 rounded-lg mb-3 inline-flex items-center gap-2",
              isToday(date) ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground",
              isDatePast && "opacity-60"
            )}>
              <Clock className="w-4 h-4" />
              <span className="font-medium capitalize">{getDateLabel(dateStr)}</span>
              <Badge variant="secondary" className="text-xs">
                {dayScripts.length} {dayScripts.length === 1 ? 'conteúdo' : 'conteúdos'}
              </Badge>
            </div>

            {/* Scripts for this date */}
            <div className="space-y-3 pl-4 border-l-2 border-border ml-2">
              {dayScripts.map(script => {
                const project = getProject(script.project_id);
                const wordCount = script.content.trim() ? script.content.trim().split(/\s+/).length : 0;
                
                return (
                  <Card 
                    key={script.id} 
                    className={cn(
                      "glass-card cursor-pointer hover:shadow-lg transition-all",
                      isDatePast && "opacity-60"
                    )}
                    onClick={() => onSelectScript(script)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-medium">{script.title}</h3>
                            <Badge className={platformColors[script.platform]}>
                              {platformLabels[script.platform]}
                            </Badge>
                            <Badge className={statusColors[script.status]}>
                              {statusLabels[script.status]}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {script.content || 'Sem conteúdo'}
                          </p>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                        
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <Pen className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
