import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Plus, Instagram, Youtube, Linkedin, Globe, Clock, Pencil, ThumbsUp, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditorialItemForm } from '@/components/editorial/EditorialItemForm';

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
  [key: string]: unknown;
}

interface ClientContentCalendarPreviewProps {
  workspaceId: string;
  clientId: string;
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

const APPROVAL_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Aguardando revisão', color: 'border-yellow-500/50 text-yellow-500', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Aprovado pelo cliente', color: 'border-emerald-500/50 text-emerald-500', icon: <ThumbsUp className="w-3 h-3" /> },
  adjustment_requested: { label: 'Ajuste solicitado', color: 'border-orange-500/50 text-orange-500', icon: <MessageSquare className="w-3 h-3" /> },
};

function formatDateWithDay(dateStr: string): string {
  const date = parseISO(dateStr.includes('T') ? dateStr : dateStr);
  return format(new Date(dateStr), "EEE, dd 'de' MMM", { locale: ptBR });
}

export function ClientContentCalendarPreview({ workspaceId, clientId }: ClientContentCalendarPreviewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditorialItem | null>(null);
  const queryClient = useQueryClient();

  const queryKey = ['editorial-calendar-preview', workspaceId, clientId];

  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('editorial_calendar_items')
        .select('id, title, platform, content_type, status, due_date, description, content_link, client_approval_status, client_adjustment_notes')
        .eq('client_id', clientId)
        .order('due_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data as EditorialItem[];
    },
    enabled: !!clientId,
  });

  // Real-time subscription for manager side
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`manager-calendar-preview-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'editorial_calendar_items',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey });
  };

  const openEdit = (item: EditorialItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const openNew = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Calendário Editorial do Cliente
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={openNew}
            >
              <Plus className="w-3 h-3" />
              Novo Conteúdo
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
                <p className="text-xs text-muted-foreground mt-0.5">Adicione o primeiro conteúdo deste cliente.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={openNew}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Conteúdo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const approvalKey = item.client_approval_status ?? 'pending';
                const approval = APPROVAL_CONFIG[approvalKey] ?? APPROVAL_CONFIG.pending;
                const hasAdjustmentNotes = approvalKey === 'adjustment_requested' && item.client_adjustment_notes;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 p-3 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground">
                        {PLATFORM_ICONS[item.platform] ?? <Globe className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground capitalize">
                              {formatDateWithDay(item.due_date)}
                            </span>
                          </div>
                          {item.client_approval_status && (
                            <Badge variant="outline" className={`text-xs gap-1 ${approval.color}`}>
                              {approval.icon}
                              {approval.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_COLORS[item.status ?? 'idea'] ?? STATUS_COLORS.idea}`}
                        >
                          {STATUS_LABELS[item.status ?? 'idea'] ?? item.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6"
                          onClick={() => openEdit(item)}
                          title="Editar conteúdo"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Adjustment notes visible to manager */}
                    {hasAdjustmentNotes && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-orange-500/10 border border-orange-500/20 text-xs text-orange-500">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">Pedido de ajuste do cliente: </span>
                          {item.client_adjustment_notes as string}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-2 text-muted-foreground hover:text-foreground mt-1"
                onClick={openNew}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar conteúdo ao cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) { setIsFormOpen(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-visible">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingItem ? 'Editar Conteúdo' : 'Novo Conteúdo para o Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <EditorialItemForm
              onSuccess={handleSuccess}
              clientId={clientId}
              editingItem={editingItem}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
