import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ContentItemCard } from './ContentItemCard';
import type { EditorialCalendarItem } from '@/types/editorial';

interface CalendarDayCellProps {
  day: Date;
  items: EditorialCalendarItem[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onItemClick?: (item: EditorialCalendarItem) => void;
}

export function CalendarDayCell({ 
  day, 
  items, 
  isCurrentMonth, 
  isToday,
  onItemClick 
}: CalendarDayCellProps) {
  const maxVisibleItems = 2;
  const visibleItems = items.slice(0, maxVisibleItems);
  const remainingCount = items.length - maxVisibleItems;

  return (
    <div
      className={cn(
        "min-h-[80px] md:min-h-[100px] p-1 rounded-lg border border-border/50 transition-colors",
        isCurrentMonth 
          ? "bg-card/50" 
          : "bg-muted/30 opacity-50",
        isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      {/* Day number */}
      <div className={cn(
        "text-xs font-medium mb-1 text-center md:text-left",
        isToday 
          ? "text-primary font-bold" 
          : isCurrentMonth 
            ? "text-foreground" 
            : "text-muted-foreground"
      )}>
        {format(day, 'd')}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <ContentItemCard
            key={item.id}
            item={item}
            compact
            onClick={() => onItemClick?.(item)}
          />
        ))}

        {/* Show more indicator */}
        {remainingCount > 0 && (
          <button
            className="w-full text-[10px] text-muted-foreground hover:text-foreground text-center py-0.5 rounded hover:bg-muted/50 transition-colors"
            onClick={() => {
              // Could open a modal with all items for this day
              console.log('Show more items for', format(day, 'yyyy-MM-dd'));
            }}
          >
            +{remainingCount} mais
          </button>
        )}
      </div>
    </div>
  );
}
