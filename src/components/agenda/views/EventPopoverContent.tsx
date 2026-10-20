import { Clock, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTypeConf, type AgendaViewEvent } from './events';

export const KIND_LABELS: Record<AgendaViewEvent['kind'], string> = {
  appointment: 'Compromisso',
  unavailability: 'Indisponível',
  personal: 'Pessoal',
};

const STATUS_LABELS: Record<NonNullable<AgendaViewEvent['status']>, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

export type EventViewMode = 'edit' | 'read';

interface EventPopoverContentProps {
  event: AgendaViewEvent;
  conflicted: boolean;
  mode: EventViewMode;
  onEdit?: (e: AgendaViewEvent) => void;
  onRequestDelete?: (e: AgendaViewEvent) => void;
}

export function EventPopoverContent({ event, conflicted, mode, onEdit, onRequestDelete }: EventPopoverContentProps) {
  const tc = getTypeConf(event.type);
  const accent = event.color ?? tc.color;
  const badgeLabel = event.type ? tc.label : KIND_LABELS[event.kind];

  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-tight break-words">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{event.start} – {event.end}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 h-4"
            style={{ borderColor: accent, color: accent }}
          >
            {badgeLabel}
          </Badge>
          {event.status && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 h-4 text-muted-foreground"
            >
              {STATUS_LABELS[event.status]}
            </Badge>
          )}
        </div>
        {conflicted && (
          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-amber-500">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Conflito de horário
          </div>
        )}
      </div>
      {mode === 'edit' && (
        <div className="flex gap-2 pt-2 border-t border-border/50">
          <Button
            variant="outline" size="sm"
            className="flex-1 h-9 text-xs gap-1 touch-manipulation"
            onClick={() => onEdit?.(event)}
          >
            <Edit2 className="w-3 h-3" /> Editar
          </Button>
          <Button
            variant="outline" size="sm"
            className="h-9 w-9 p-0 shrink-0 touch-manipulation text-destructive hover:bg-destructive/10 hover:border-destructive/40"
            onClick={() => onRequestDelete?.(event)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
