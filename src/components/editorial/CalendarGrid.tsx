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
      <div className="space-y-2">
        {/* Week grid - responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
          {days.map((day) => {
            const dayItems = getItemsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "min-h-[120px] md:min-h-[200px] p-2 rounded-lg border border-border/50 transition-colors bg-card/50",
                  isCurrentDay && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
              >
                {/* Day header */}
                <div className="text-center mb-2 pb-2 border-b border-border/50">
                  <div className="text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold",
                    isCurrentDay && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Day items */}
                <div className="space-y-2">
                  {dayItems.map(item => (
                    <ContentItemCard
                      key={item.id}
                      item={item}
                      onClick={() => onItemClick?.(item)}
                      compact={false}
                    />
                  ))}
                  {dayItems.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Nenhum conteúdo
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
