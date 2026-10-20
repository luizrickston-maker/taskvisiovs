import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth, isSameDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  APPOINTMENT_TYPES, getTypeConf, groupEventsByDate, type AgendaViewEvent,
} from './events';
import { EventPopoverContent, KIND_LABELS, type EventViewMode } from './EventPopoverContent';

interface MonthViewProps {
  selectedDate: Date;
  events: AgendaViewEvent[];
  onDaySelect: (d: Date) => void;
  onAddAt?: (d: Date) => void;
  mode: EventViewMode;
}

export function AgendaMonthView({ selectedDate, events, onDaySelect, onAddAt, mode }: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd   = endOfMonth(selectedDate);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays    = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const byDate     = groupEventsByDate(events);
  const legend     = mode === 'edit'
    ? APPOINTMENT_TYPES.map(t => ({ key: t.value, label: t.label, color: t.color }))
    : Object.entries(KIND_LABELS).map(([kind, label]) => ({
        key: kind,
        label,
        color: kind === 'unavailability' ? '#6b7280' : kind === 'appointment' ? '#3b82f6' : '#ec4899',
      }));

  return (
    <div className="rounded-lg border border-border/30 overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border/30 bg-muted/30">
        {weekLabels.map(d => (
          <div key={d} className="py-2 text-center text-[10px] md:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {allDays.map((day, idx) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = byDate.get(dayKey) ?? [];
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const today = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const MAX_VISIBLE = 2;
          const overflow = dayEvents.length - MAX_VISIBLE;

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[72px] md:min-h-[90px] p-1 md:p-1.5 border-b border-r border-border/20 cursor-pointer group transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                today && 'bg-primary/5',
                isSelected && !today && 'bg-accent/30',
                'hover:bg-accent/20 active:bg-accent/40',
              )}
              onClick={() => onDaySelect(day)}
            >
              <div className="flex items-center justify-between mb-0.5 md:mb-1">
                <span className={cn(
                  'inline-flex w-5 h-5 md:w-6 md:h-6 items-center justify-center rounded-full text-[11px] md:text-xs font-semibold',
                  today ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                )}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && mode === 'edit' && onAddAt && (
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                    onClick={e => { e.stopPropagation(); onAddAt(day); }}
                    title="Adicionar compromisso"
                  >
                    <Plus className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_VISIBLE).map(ev => (
                  <div
                    key={ev.id}
                    className="truncate rounded px-1 py-0.5 text-[9px] md:text-[10px] font-medium text-white leading-tight"
                    style={{ background: ev.color ?? undefined }}
                  >
                    <span className="hidden sm:inline opacity-80 mr-0.5">{ev.start} </span>
                    {ev.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="text-[9px] md:text-[10px] text-muted-foreground font-medium px-0.5">
                    +{overflow}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend — hidden on mobile to save space */}
      <div className="hidden sm:flex px-3 py-2 border-t border-border/30 bg-muted/20 flex-wrap gap-3">
        {legend.map(t => (
          <div key={t.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
            <span className="text-[10px] text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
