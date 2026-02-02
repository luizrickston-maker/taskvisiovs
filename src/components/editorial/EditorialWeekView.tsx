import { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addWeeks,
  subWeeks,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentItemCard } from './ContentItemCard';
import { cn } from '@/lib/utils';
import type { EditorialCalendarItem } from '@/types/editorial';

interface EditorialWeekViewProps {
  items: EditorialCalendarItem[];
  onItemClick?: (item: EditorialCalendarItem) => void;
}

export function EditorialWeekView({ items, onItemClick }: EditorialWeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const days = useMemo(() => 
    eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const getItemsForDay = (day: Date) => {
    return items.filter(item => {
      const itemDate = new Date(item.due_date);
      return isSameDay(itemDate, day);
    });
  };

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(weekEnd, "d 'de' MMMM yyyy", { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-4">
        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayItems = getItemsForDay(day);
            const isCurrentDay = isToday(day);

            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "min-h-[200px] p-2 rounded-lg border border-border/50 transition-colors",
                  isCurrentDay && "bg-primary/5 border-primary/30"
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
      </CardContent>
    </Card>
  );
}
