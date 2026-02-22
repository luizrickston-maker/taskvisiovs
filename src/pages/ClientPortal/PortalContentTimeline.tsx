import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Instagram, Youtube, Linkedin, Globe, Clock,
  CheckCircle2, FileEdit, Lightbulb, Eye, ExternalLink, ThumbsUp,
  MessageSquare, Loader2, AlertCircle, ListChecks
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

interface PortalContentTimelineProps {
  workspaceId: string;
  clientId: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
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

function getDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function PortalContentTimeline({ workspaceId, clientId }: PortalContentTimelineProps) {
  const queryClient = useQueryClient();
  const [reviewItem, setReviewItem] = useState<EditorialItem | null>(null);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const queryKey = ['portal-timeline', workspaceId, clientId];

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

  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`portal-timeline-${clientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'editorial_calendar_items', filter: `client_id=eq.${clientId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['portal-calendar', workspaceId, clientId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, queryClient]);

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

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            Linha do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum conteúdo agendado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const statusKey = item.status ?? 'idea';
                const approvalKey = item.client_approval_status ?? 'pending';
                const approval = APPROVAL_CONFIG[approvalKey] ?? APPROVAL_CONFIG.pending;
                const hasLink = !!item.content_link;
                const overdue = isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date));

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white mt-0.5", PLATFORM_COLORS[item.platform] ?? 'bg-muted')}>
                      {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={cn("text-[10px] sm:text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                          {getDateLabel(item.due_date)}
                        </span>
                        <span className="text-muted-foreground text-[10px]">·</span>
                        <Badge variant="outline" className={`text-[10px] sm:text-xs gap-0.5 px-1.5 py-0 h-5 ${STATUS_COLORS[statusKey]}`}>
                          {STATUS_ICONS[statusKey]}
                          {STATUS_LABELS[statusKey] ?? statusKey}
                        </Badge>
                        {hasLink && (
                          <Badge variant="outline" className={`text-[10px] sm:text-xs gap-0.5 px-1.5 py-0 h-5 ${approval.color}`}>
                            {approval.icon}
                            <span className="hidden sm:inline">{approval.label}</span>
                          </Badge>
                        )}
                      </div>
                      {approvalKey === 'adjustment_requested' && item.client_adjustment_notes && (
                        <p className="text-[10px] sm:text-xs text-orange-500 mt-1 truncate">
                          Ajuste: {item.client_adjustment_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {hasLink && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:text-xs gap-1 text-muted-foreground hover:text-primary" onClick={() => window.open(item.content_link!, '_blank')}>
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver</span>
                          </Button>
                          {approvalKey !== 'approved' && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:text-xs gap-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleApprove(item)}>
                              <ThumbsUp className="w-3 h-3" />
                              <span>Aprovar</span>
                            </Button>
                          )}
                          {approvalKey !== 'adjustment_requested' && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:text-xs gap-1 border-orange-500/30 text-orange-500 hover:bg-orange-500/10" onClick={() => { setReviewItem(item); setAdjustmentNotes(item.client_adjustment_notes ?? ''); }}>
                              <MessageSquare className="w-3 h-3" />
                              <span>Ajuste</span>
                            </Button>
                          )}
                        </>
                      )}
                      {!hasLink && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Sem link
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
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
