import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Instagram, Youtube, Linkedin, Globe, Clock,
  CheckCircle2, FileEdit, Lightbulb, Eye, ExternalLink, ThumbsUp,
  MessageSquare, Loader2, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  format, isToday as isDateToday, isTomorrow, isPast, isSameDay, isSameMonth,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface EditorialItem {
  id: string;
  title: string;
  platform: string;
  content_type: string;
  status: string | null;
  due_date: string;
  description: string | null;
  content_link: string | null;
  client_approval_status: string | null;
  client_adjustment_notes: string | null;
}

interface PortalCalendarProps {
  workspaceId: string;
  clientId: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  youtube: <Youtube className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-platform-instagram',
  youtube: 'bg-platform-youtube',
  linkedin: 'bg-platform-linkedin',
  tiktok: 'bg-platform-tiktok',
  blog: 'bg-platform-blog',
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

const APPROVAL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Aguardando revisão', color: 'border-yellow-500/50 text-yellow-500', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Aprovado por você', color: 'border-emerald-500/50 text-emerald-500', icon: <ThumbsUp className="w-3 h-3" /> },
  adjustment_requested: { label: 'Ajuste solicitado', color: 'border-orange-500/50 text-orange-500', icon: <MessageSquare className="w-3 h-3" /> },
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ─── Detail Card (shown in modal) ─── */
function ItemDetailCard({ item, onAction }: { item: EditorialItem; onAction: (item: EditorialItem, action: 'approve' | 'adjust') => void }) {
  const statusKey = item.status ?? 'idea';
  const approvalKey = item.client_approval_status ?? 'pending';
  const approval = APPROVAL_CONFIG[approvalKey] ?? APPROVAL_CONFIG.pending;
  const hasLink = !!item.content_link;

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg border border-border/40 bg-muted/10">
      <div className="flex items-start gap-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white", PLATFORM_COLORS[item.platform] ?? 'bg-muted')}>
          {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className={`text-xs gap-1 ${STATUS_COLORS[statusKey]}`}>
              {STATUS_ICONS[statusKey]}
              {STATUS_LABELS[statusKey] ?? statusKey}
            </Badge>
            {hasLink && (
              <Badge variant="outline" className={`text-xs gap-1 ${approval.color}`}>
                {approval.icon}
                {approval.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {approvalKey === 'adjustment_requested' && item.client_adjustment_notes && (
        <div className="text-xs bg-orange-500/10 border border-orange-500/20 rounded-md p-2 text-orange-500">
          <span className="font-medium">Seu pedido de ajuste:</span> {item.client_adjustment_notes}
        </div>
      )}

      {hasLink && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => window.open(item.content_link!, '_blank')}>
            <ExternalLink className="w-3 h-3" /> Ver conteúdo
          </Button>
          {approvalKey !== 'approved' && (
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => onAction(item, 'approve')}>
              <ThumbsUp className="w-3 h-3" /> Aprovar
            </Button>
          )}
          {approvalKey !== 'adjustment_requested' && (
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5 border-orange-500/50 text-orange-500 hover:bg-orange-500/10" onClick={() => onAction(item, 'adjust')}>
              <MessageSquare className="w-3 h-3" /> Pedir ajuste
            </Button>
          )}
        </div>
      )}

      {!hasLink && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3" /> Conteúdo ainda não disponível para visualização
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export function PortalCalendar({ workspaceId, clientId }: PortalCalendarProps) {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [reviewItem, setReviewItem] = useState<EditorialItem | null>(null);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const queryKey = ['portal-calendar', workspaceId, clientId];

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .select('id, title, platform, content_type, status, due_date, description, content_link, client_approval_status, client_adjustment_notes')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as EditorialItem[];
    },
    enabled: !!clientId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`portal-calendar-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'editorial_calendar_items', filter: `client_id=eq.${clientId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['portal-timeline', workspaceId, clientId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, workspaceId, queryClient]);

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart.getTime(), calendarEnd.getTime()]);

  const getItemsForDay = useCallback((day: Date) => {
    return items.filter(item => isSameDay(new Date(item.due_date), day));
  }, [items]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    return getItemsForDay(selectedDay);
  }, [selectedDay, getItemsForDay]);

  // Actions
  const handleApprove = useCallback(async (item: EditorialItem) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('editorial_calendar_items')
      .update({ client_approval_status: 'approved', client_adjustment_notes: null, client_reviewed_at: new Date().toISOString() })
      .eq('id', item.id);
    setIsSaving(false);
    if (error) { toast.error('Erro ao aprovar conteúdo'); }
    else { toast.success('Conteúdo aprovado! ✅'); queryClient.invalidateQueries({ queryKey }); }
  }, [queryClient, queryKey]);

  const handleRequestAdjustment = useCallback(async () => {
    if (!reviewItem || !adjustmentNotes.trim()) { toast.error('Por favor, descreva o ajuste necessário.'); return; }
    setIsSaving(true);
    const { error } = await supabase
      .from('editorial_calendar_items')
      .update({ client_approval_status: 'adjustment_requested', client_adjustment_notes: adjustmentNotes.trim(), client_reviewed_at: new Date().toISOString() })
      .eq('id', reviewItem.id);
    setIsSaving(false);
    if (error) { toast.error('Erro ao enviar pedido de ajuste'); }
    else { toast.success('Pedido de ajuste enviado! 📝'); setReviewItem(null); setAdjustmentNotes(''); queryClient.invalidateQueries({ queryKey }); }
  }, [reviewItem, adjustmentNotes, queryClient, queryKey]);

  const handleItemAction = useCallback((item: EditorialItem, action: 'approve' | 'adjust') => {
    if (action === 'approve') { handleApprove(item); }
    else { setReviewItem(item); setAdjustmentNotes(item.client_adjustment_notes ?? ''); }
  }, [handleApprove]);

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-semibold capitalize flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setCurrentDate(new Date()); setSelectedDay(null); }}>
                Hoje
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : (
            <>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEK_DAYS.map(d => (
                  <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map(day => {
                  const dayItems = getItemsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const today = isDateToday(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                      className={cn(
                        "min-h-[52px] sm:min-h-[72px] md:min-h-[88px] p-1 rounded-lg border transition-all text-left",
                        isCurrentMonth ? "bg-card/50 border-border/50" : "bg-muted/20 border-border/20 opacity-50",
                        today && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                        isSelected && "border-primary bg-primary/5",
                        "hover:bg-muted/40"
                      )}
                    >
                      <div className={cn(
                        "text-[10px] sm:text-xs font-medium mb-0.5 text-center sm:text-left",
                        today ? "text-primary font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </div>

                      {/* Item indicators */}
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 2).map(item => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-1 px-1 py-0.5 rounded text-[8px] sm:text-[10px] md:text-xs truncate",
                              "bg-card/80 border border-border/40"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0", PLATFORM_COLORS[item.platform] ?? 'bg-muted')} />
                            <span className="truncate hidden sm:inline">{item.title}</span>
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center">
                            +{dayItems.length - 2}
                          </div>
                        )}
                        {/* Mobile: show dot indicators only */}
                        {dayItems.length > 0 && dayItems.length <= 2 && (
                          <div className="flex gap-0.5 justify-center sm:hidden">
                            {dayItems.map(item => (
                              <div key={item.id} className={cn("w-1.5 h-1.5 rounded-full", PLATFORM_COLORS[item.platform] ?? 'bg-muted')} />
                            ))}
                          </div>
                        )}
                        {dayItems.length > 2 && (
                          <div className="flex gap-0.5 justify-center sm:hidden">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[8px] text-muted-foreground">+{dayItems.length}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay && selectedDayItems.length > 0} onOpenChange={open => { if (!open) setSelectedDay(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4 text-primary" />
              {selectedDay && format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
            {selectedDayItems.map(item => (
              <ItemDetailCard key={item.id} item={item} onAction={handleItemAction} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjustment Request Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={open => { if (!open) { setReviewItem(null); setAdjustmentNotes(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-orange-500" />
              Pedir ajuste
            </DialogTitle>
          </DialogHeader>
          {reviewItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <p className="text-sm font-medium">{reviewItem.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{reviewItem.platform} · {reviewItem.content_type}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">O que deve ser ajustado?</label>
                <Textarea
                  placeholder="Descreva o ajuste necessário com detalhes..."
                  value={adjustmentNotes}
                  onChange={e => setAdjustmentNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setReviewItem(null); setAdjustmentNotes(''); }}>Cancelar</Button>
            <Button size="sm" className="gap-1.5" onClick={handleRequestAdjustment} disabled={isSaving || !adjustmentNotes.trim()}>
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
