import { useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarDayCell } from './CalendarDayCell';
import { ContentItemCard } from './ContentItemCard';
import type { EditorialCalendarItem } from '@/types/editorial';

type CalendarViewType = 'month' | 'week';

interface CalendarGridProps {
  items: EditorialCalendarItem[];
  currentDate: Date;
  view: CalendarViewType;
  onItemClick?: (item: EditorialCalendarItem) => void;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarGrid({ items, currentDate, view, onItemClick }: CalendarGridProps) {
  // Calculate days based on view type
  const days = useMemo(() => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, view]);

  const getItemsForDay = (day: Date) => {
    return items.filter(item => {
      const itemDate = new Date(item.due_date);
      return isSameDay(itemDate, day);
    });
  };

  if (view === 'week') {
    return (
      <div className="space-y-3">
        {/* Week days header - visible on desktop */}
        <div className="hidden md:grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <div 
              key={day} 
              className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Week grid - responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2 md:gap-3">
          {days.map((day) => {
            const dayItems = getItemsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  // Base glass-card styling
                  "min-h-[140px] md:min-h-[220px] p-3 rounded-xl transition-all duration-200",
                  "bg-card/60 backdrop-blur-sm border border-border/40",
                  "shadow-sm hover:shadow-md hover:border-border/60",
                  // Today highlight
                  isCurrentDay && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background bg-primary/5"
                )}
              >
                {/* Day header */}
                <div className={cn(
                  "text-center mb-3 pb-2 border-b border-border/30",
                  isCurrentDay && "border-primary/30"
                )}>
                  {/* Show day name on mobile */}
                  <div className="md:hidden text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                    {format(day, 'EEEE', { locale: ptBR })}
                  </div>
                  <div className={cn(
                    "text-xl font-bold transition-colors",
                    isCurrentDay ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {format(day, 'MMM', { locale: ptBR })}
                  </div>
                </div>

                {/* Day items with scroll */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin">
                  {dayItems.map(item => (
                    <ContentItemCard
                      key={item.id}
                      item={item}
                      onClick={() => onItemClick?.(item)}
                      compact={false}
                    />
                  ))}
                  {dayItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
                      <div className="text-xs">Nenhum conteúdo</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Month view
  return (
    <div className="space-y-2">
      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div 
            key={day} 
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayItems = getItemsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <CalendarDayCell
              key={day.toISOString()}
              day={day}
              items={dayItems}
              isCurrentMonth={isCurrentMonth}
              isToday={isCurrentDay}
              onItemClick={onItemClick}
            />
          );
        })}
      </div>
    </div>
  );
}
