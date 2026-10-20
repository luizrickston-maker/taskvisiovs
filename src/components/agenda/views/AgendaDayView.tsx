import { format, isToday } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
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

interface DayViewProps {
  date: Date;
  events: AgendaViewEvent[];
  onAddAt?: (startTime: string) => void;
  onEdit?: (e: AgendaViewEvent) => void;
  onRequestDelete?: (e: AgendaViewEvent) => void;
  mode: EventViewMode;
}

export function AgendaDayView({ date, events, onAddAt, onEdit, onRequestDelete, mode }: DayViewProps) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - START_HOUR * 60) / (TOTAL_HOURS * 60)) * 100;
  const showNow = isToday(date) && nowMin > START_HOUR * 60 && nowMin < END_HOUR * 60;
  const dayKey = format(date, 'yyyy-MM-dd');
  const dayEvents = (groupEventsByDate(events).get(dayKey) ?? []);

  function handleBgClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== 'edit' || !onAddAt) return;
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = START_HOUR * 60 + Math.floor((y / CONTAINER_HEIGHT) * TOTAL_HOURS * 60);
    const rounded = Math.floor(totalMin / 30) * 30;
    onAddAt(`${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`);
  }

  return (
    <div className="overflow-y-auto rounded-lg border border-border/30" style={{ maxHeight: 'min(520px, 65vh)' }}>
      <div className="flex" style={{ minHeight: CONTAINER_HEIGHT }}>
        {/* Hour labels */}
        <div className="w-12 shrink-0 relative select-none" style={{ height: CONTAINER_HEIGHT }}>
          {HOURS.map(h => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-muted-foreground/60 leading-none"
              style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, transform: 'translateY(-50%)' }}
            >
              {String(h).padStart(2, '0')}h
            </div>
          ))}
        </div>

        {/* Timeline area */}
        <div
          className="flex-1 relative border-l border-border/30 cursor-pointer"
          style={{ height: CONTAINER_HEIGHT }}
          onClick={handleBgClick}
        >
          {HOURS.map(h => (
            <div key={h} className="absolute w-full border-t border-border/25"
              style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }} />
          ))}
          {HOURS.slice(0, -1).map(h => (
            <div key={`hh-${h}`} className="absolute w-full border-t border-dashed border-border/10"
              style={{ top: `${((h - START_HOUR + 0.5) / TOTAL_HOURS) * 100}%` }} />
          ))}

          {/* Now line */}
          {showNow && (
            <div className="absolute w-full flex items-center z-20 pointer-events-none" style={{ top: `${nowTop}%` }}>
              <div className="w-2.5 h-2.5 rounded-full bg-primary -ml-1.5 shrink-0" />
              <div className="flex-1 h-px bg-primary" />
            </div>
          )}

          {/* Events */}
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
                      'absolute left-1 right-1 rounded-md px-2 py-1 text-white text-[11px] cursor-pointer z-10',
                      'hover:brightness-110 active:brightness-95 transition-all shadow-sm overflow-hidden select-none',
                      conflicted && 'ring-2 ring-destructive/70 ring-offset-1',
                    )}
                    style={{
                      top: `${topPct}%`,
                      height: `${heightPct}%`,
                      minHeight: 28,
                      background: ev.color ?? tc.color,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-1 overflow-hidden h-full">
                      {conflicted && <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 opacity-90" />}
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight truncate">{ev.title}</p>
                        {duration >= 30 && (
                          <p className="opacity-80 text-[10px] leading-tight">{ev.start}–{ev.end}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  alignOffset={-4}
                  avoidCollisions
                  collisionPadding={12}
                  className="w-[min(224px,calc(100vw-24px))] p-3 z-30"
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

          {dayEvents.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <p className="text-xs text-muted-foreground/50">Nenhum compromisso</p>
              <p className="text-[10px] text-muted-foreground/35 hidden md:block">Toque na timeline para adicionar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
