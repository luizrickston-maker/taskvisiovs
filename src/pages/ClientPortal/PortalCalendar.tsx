import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Instagram, Youtube, Linkedin, Globe, Clock, CheckCircle2, FileEdit, Lightbulb, Eye } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditorialItem {
  id: string;
  title: string;
  platform: string;
  content_type: string;
  status: string | null;
  due_date: string;
  description: string | null;
}

interface PortalCalendarProps {
  workspaceId: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'text-pink-500',
  youtube: 'text-red-500',
  linkedin: 'text-blue-600',
  tiktok: 'text-foreground',
  blog: 'text-emerald-500',
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
  review: 'Em Revisão',
  approved: 'Aprovado',
  published: 'Publicado',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  idea: <Lightbulb className="w-3 h-3" />,
  draft: <FileEdit className="w-3 h-3" />,
  review: <Eye className="w-3 h-3" />,
  approved: <CheckCircle2 className="w-3 h-3" />,
  published: <CheckCircle2 className="w-3 h-3" />,
};

function formatDueDate(dateStr: string): { label: string; isUrgent: boolean } {
  const date = new Date(dateStr);
  if (isPast(date)) return { label: 'Atrasado', isUrgent: true };
  if (isToday(date)) return { label: 'Hoje', isUrgent: true };
  if (isTomorrow(date)) return { label: 'Amanhã', isUrgent: false };
  return { label: format(date, "dd 'de' MMM", { locale: ptBR }), isUrgent: false };
}

export function PortalCalendar({ workspaceId }: PortalCalendarProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['portal-calendar', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .select('id, title, platform, content_type, status, due_date, description')
        .eq('workspace_id', workspaceId)
        .order('due_date', { ascending: true })
        .limit(30);
      if (error) throw error;
      return data as EditorialItem[];
    },
    enabled: !!workspaceId,
  });

  const upcoming = items.filter(i => !isPast(new Date(i.due_date)) || isToday(new Date(i.due_date)));
  const past = items.filter(i => isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date)));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Calendário de Conteúdo
          {!isLoading && (
            <Badge variant="outline" className="ml-auto text-xs">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground opacity-30" />
            <div>
              <p className="text-sm font-medium">Nenhum conteúdo agendado</p>
              <p className="text-xs text-muted-foreground mt-1">Os itens do calendário editorial aparecerão aqui.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Próximos</p>
                {upcoming.map(item => {
                  const { label, isUrgent } = formatDueDate(item.due_date);
                  const statusKey = item.status ?? 'idea';
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${PLATFORM_COLORS[item.platform] ?? 'text-muted-foreground'}`}>
                        {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            <Clock className="w-3 h-3" />
                            {label}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 gap-1 ${STATUS_COLORS[statusKey] ?? STATUS_COLORS.idea}`}>
                        {STATUS_ICONS[statusKey]}
                        {STATUS_LABELS[statusKey] ?? statusKey}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {past.length > 0 && (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground py-1 select-none">
                  {past.length} item{past.length !== 1 ? 's' : ''} anterior{past.length !== 1 ? 'es' : ''}
                </summary>
                <div className="space-y-1.5 mt-2">
                  {past.map(item => {
                    const statusKey = item.status ?? 'idea';
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/20 opacity-60">
                        <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">
                          {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3 h-3" />}
                        </div>
                        <p className="text-xs text-foreground truncate flex-1">{item.title}</p>
                        <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[statusKey]}`}>
                          {STATUS_LABELS[statusKey] ?? statusKey}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
