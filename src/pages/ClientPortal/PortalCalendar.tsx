import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  CalendarDays, Instagram, Youtube, Linkedin, Globe, Clock,
  CheckCircle2, FileEdit, Lightbulb, Eye, ExternalLink, ThumbsUp,
  MessageSquare, Loader2, AlertCircle, Link as LinkIcon
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
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

const APPROVAL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Aguardando revisão', color: 'border-yellow-500/50 text-yellow-500', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Aprovado por você', color: 'border-emerald-500/50 text-emerald-500', icon: <ThumbsUp className="w-3 h-3" /> },
  adjustment_requested: { label: 'Ajuste solicitado', color: 'border-orange-500/50 text-orange-500', icon: <MessageSquare className="w-3 h-3" /> },
};

function formatDueDate(dateStr: string): { label: string; isUrgent: boolean } {
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return { label: 'Atrasado', isUrgent: true };
  if (isToday(date)) return { label: 'Hoje', isUrgent: true };
  if (isTomorrow(date)) return { label: 'Amanhã', isUrgent: false };
  return { label: format(date, "dd 'de' MMM", { locale: ptBR }), isUrgent: false };
}

function ItemCard({ item, onReview }: { item: EditorialItem; onReview: (item: EditorialItem) => void }) {
  const { label, isUrgent } = formatDueDate(item.due_date);
  const statusKey = item.status ?? 'idea';
  const approvalKey = item.client_approval_status ?? 'pending';
  const approval = APPROVAL_CONFIG[approvalKey] ?? APPROVAL_CONFIG.pending;
  const hasLink = !!item.content_link;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${PLATFORM_COLORS[item.platform] ?? 'text-muted-foreground'}`}>
          {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              <Clock className="w-3 h-3" />
              {label}
            </span>
            <Badge variant="outline" className={`text-xs gap-1 ${STATUS_COLORS[statusKey] ?? STATUS_COLORS.idea}`}>
              {STATUS_ICONS[statusKey]}
              {STATUS_LABELS[statusKey] ?? statusKey}
            </Badge>
          </div>
        </div>
      </div>

      {/* Approval status */}
      {hasLink && (
        <Badge variant="outline" className={`text-xs gap-1 w-fit ${approval.color}`}>
          {approval.icon}
          {approval.label}
        </Badge>
      )}

      {/* Adjustment notes (if requested) */}
      {approvalKey === 'adjustment_requested' && item.client_adjustment_notes && (
        <div className="text-xs bg-orange-500/10 border border-orange-500/20 rounded-md p-2 text-orange-500">
          <span className="font-medium">Seu pedido de ajuste:</span> {item.client_adjustment_notes}
        </div>
      )}

      {/* Actions */}
      {hasLink && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 gap-1.5"
            onClick={() => window.open(item.content_link!, '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
            Ver conteúdo
          </Button>
          {approvalKey !== 'approved' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
              onClick={() => onReview({ ...item, _action: 'approve' } as any)}
            >
              <ThumbsUp className="w-3 h-3" />
              Aprovar
            </Button>
          )}
          {approvalKey !== 'adjustment_requested' && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
              onClick={() => onReview(item)}
            >
              <MessageSquare className="w-3 h-3" />
              Pedir ajuste
            </Button>
          )}
        </div>
      )}

      {!hasLink && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          Conteúdo ainda não disponível para visualização
        </div>
      )}
    </div>
  );
}

export function PortalCalendar({ workspaceId, clientId }: PortalCalendarProps) {
  const queryClient = useQueryClient();
  const [reviewItem, setReviewItem] = useState<EditorialItem | null>(null);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['portal-calendar', workspaceId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .select('id, title, platform, content_type, status, due_date, description, content_link, client_approval_status, client_adjustment_notes')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true })
        .limit(50);
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'editorial_calendar_items',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['portal-calendar', workspaceId, clientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, workspaceId, queryClient]);

  const handleApprove = useCallback(async (item: EditorialItem) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('editorial_calendar_items')
      .update({
        client_approval_status: 'approved',
        client_adjustment_notes: null,
        client_reviewed_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    setIsSaving(false);
    if (error) {
      toast.error('Erro ao aprovar conteúdo');
    } else {
      toast.success('Conteúdo aprovado! ✅');
      queryClient.invalidateQueries({ queryKey: ['portal-calendar', workspaceId, clientId] });
    }
  }, [clientId, workspaceId, queryClient]);

  const handleRequestAdjustment = useCallback(async () => {
    if (!reviewItem || !adjustmentNotes.trim()) {
      toast.error('Por favor, descreva o ajuste necessário.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('editorial_calendar_items')
      .update({
        client_approval_status: 'adjustment_requested',
        client_adjustment_notes: adjustmentNotes.trim(),
        client_reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewItem.id);

    setIsSaving(false);
    if (error) {
      toast.error('Erro ao enviar pedido de ajuste');
    } else {
      toast.success('Pedido de ajuste enviado! 📝');
      setReviewItem(null);
      setAdjustmentNotes('');
      queryClient.invalidateQueries({ queryKey: ['portal-calendar', workspaceId, clientId] });
    }
  }, [reviewItem, adjustmentNotes, clientId, workspaceId, queryClient]);

  const handleCardAction = useCallback((item: EditorialItem & { _action?: string }) => {
    if ((item as any)._action === 'approve') {
      handleApprove(item);
    } else {
      setReviewItem(item);
      setAdjustmentNotes(item.client_adjustment_notes ?? '');
    }
  }, [handleApprove]);

  const upcoming = items.filter(i => !isPast(new Date(i.due_date)) || isToday(new Date(i.due_date)));
  const past = items.filter(i => isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date)));

  return (
    <>
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
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
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
                  {upcoming.map(item => (
                    <ItemCard key={item.id} item={item} onReview={handleCardAction} />
                  ))}
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
            <Button variant="outline" size="sm" onClick={() => { setReviewItem(null); setAdjustmentNotes(''); }}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleRequestAdjustment}
              disabled={isSaving || !adjustmentNotes.trim()}
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enviar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
