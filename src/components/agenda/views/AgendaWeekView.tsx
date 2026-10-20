import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { timeToMinutes } from '@/lib/schedule';
import {
  CONTAINER_HEIGHT, END_HOUR, HOURS, START_HOUR, TOTAL_HOURS,
  getTypeConf, groupEventsByDate, isConflicted, type AgendaViewEvent,
} from './events';
import { EventPopoverContent, type EventViewMode } from './EventPopoverContent';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

interface WeekViewProps {
  days: Date[];
  events: AgendaViewEvent[];
  onDaySelect: (d: Date) => void;
  onAddAt?: (d: Date, time: string) => void;
  onEdit?: (e: AgendaViewEvent) => void;
  onRequestDelete?: (e: AgendaViewEvent) => void;
  mode: EventViewMode;
}

export function AgendaWeekView({ days, events, onDaySelect, onAddAt, onEdit, onRequestDelete, mode }: WeekViewProps) {
  const byDate = groupEventsByDate(events);

  function handleColClick(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== 'edit' || !onAddAt) return;
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = START_HOUR * 60 + Math.floor((y / CONTAINER_HEIGHT) * TOTAL_HOURS * 60);
    const rounded = Math.floor(totalMin / 30) * 30;
    onAddAt(day, `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`);
  }

  return (
    <div className="overflow-auto rounded-lg border border-border/30" style={{ maxHeight: 'min(520px, 65vh)' }}>
      <div className="flex min-w-[400px]">
        {/* Hour labels */}
        <div className="w-10 shrink-0 relative bg-card sticky left-0 z-10" style={{ height: CONTAINER_HEIGHT + 32 }}>
          <div className="h-8 border-b border-border/30" />
          <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-1 text-[9px] text-muted-foreground/60 leading-none select-none"
                style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, transform: 'translateY(-50%)' }}
              >
                {String(h).padStart(2, '0')}h
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {days.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = byDate.get(dayKey) ?? [];
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="flex-1 min-w-[52px] border-l border-border/25 flex flex-col">
              <div
                className={cn(
                  'h-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/30 sticky top-0 bg-card z-10 shrink-0',
                  today && 'bg-primary/5',
                )}
                onClick={() => onDaySelect(day)}
              >
                <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium capitalize">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn('text-xs font-bold leading-tight', today ? 'text-primary' : 'text-foreground')}>
                  {format(day, 'd')}
                </span>
              </div>

              <div
                className="relative cursor-pointer"
                style={{ height: CONTAINER_HEIGHT }}
                onClick={(e) => handleColClick(day, e)}
              >
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full border-t border-border/15"
                    style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }} />
                ))}
                {dayEvents.map(ev => {
                  const startMin  = timeToMinutes(ev.start) - START_HOUR * 60;
                  const duration  = timeToMinutes(ev.end) - timeToMinutes(ev.start);
                  const topPct    = Math.max(0, (startMin / (TOTAL_HOURS * 60)) * 100);
                  const heightPct = Math.max(1.8, (duration / (TOTAL_HOURS * 60)) * 100);
                  const tc        = getTypeConf(ev.type);
                  const conflicted = isConflicted(ev, events);

                  return (
                    <Popover key={ev.id}>
                      <PopoverTrigger asChild>
                        <div
                          data-event
                          className={cn(
                            'absolute left-0.5 right-0.5 rounded px-1 text-white text-[9px] cursor-pointer z-10',
                            'hover:brightness-110 active:brightness-95 transition-all shadow-sm overflow-hidden select-none',
                            conflicted && 'ring-1 ring-destructive',
                          )}
                          style={{
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            minHeight: 20,
                            background: ev.color ?? tc.color,
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <p className="font-medium truncate leading-tight">{ev.title}</p>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="center"
                        sideOffset={6}
                        avoidCollisions
                        collisionPadding={12}
                        className="w-[min(208px,calc(100vw-24px))] p-3 z-30"
                        onClick={e => e.stopPropagation()}
                      >
                        <EventPopoverContent
                          event={ev}
                          conflicted={conflicted}
                          mode={mode}
                          onEdit={onEdit}
                          onRequestDelete={onRequestDelete}
                        />
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
