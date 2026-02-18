import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, ExternalLink, Instagram, Youtube, Linkedin, Globe, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface EditorialItem {
  id: string;
  title: string;
  platform: string;
  content_type: string;
  status: string | null;
  due_date: string;
}

interface ClientContentCalendarPreviewProps {
  workspaceId: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  idea: 'border-muted text-muted-foreground',
  draft: 'border-yellow-500/50 text-yellow-500',
  review: 'border-blue-500/50 text-blue-500',
  approved: 'border-emerald-500/50 text-emerald-500',
  published: 'border-primary/50 text-primary',
};

const STATUS_LABELS: Record<string, string> = {
  idea: 'Ideia',
  draft: 'Rascunho',
  review: 'Revisão',
  approved: 'Aprovado',
  published: 'Publicado',
};

export function ClientContentCalendarPreview({ workspaceId }: ClientContentCalendarPreviewProps) {
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['editorial-calendar-preview', workspaceId],
    queryFn: async () => {
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .select('id, title, platform, content_type, status, due_date')
        .eq('workspace_id', workspaceId)
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as EditorialItem[];
    },
    enabled: !!workspaceId,
  });

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Calendário Editorial
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/pj/calendario-editorial')}
          >
            Ver tudo
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground opacity-30" />
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum conteúdo agendado</p>
              <p className="text-xs text-muted-foreground mt-0.5">Conteúdos futuros aparecerão aqui.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/pj/calendario-editorial')}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Abrir Calendário
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                onClick={() => navigate('/pj/calendario-editorial')}
              >
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">
                  {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.due_date), "dd 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs shrink-0 ${STATUS_COLORS[item.status ?? 'idea'] ?? STATUS_COLORS.idea}`}
                >
                  {STATUS_LABELS[item.status ?? 'idea'] ?? item.status}
                </Badge>
              </div>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-foreground mt-1"
              onClick={() => navigate('/pj/calendario-editorial')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver calendário completo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
