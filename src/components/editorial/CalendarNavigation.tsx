import { useMemo } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

type CalendarViewType = 'month' | 'week';

interface CalendarNavigationProps {
  currentDate: Date;
  view: CalendarViewType;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: CalendarViewType) => void;
  showViewToggle?: boolean;
  className?: string;
}

export function CalendarNavigation({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  showViewToggle = true,
  className,
}: CalendarNavigationProps) {
  // Navigation handlers
  const goToPrevious = () => {
    if (view === 'month') {
      onDateChange(subMonths(currentDate, 1));
    } else {
      onDateChange(subWeeks(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      onDateChange(addMonths(currentDate, 1));
    } else {
      onDateChange(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => onDateChange(new Date());

  // Format current period label
  const periodLabel = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}`;
    }
  }, [currentDate, view]);

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
      {/* Period label */}
      <h2 className="text-lg font-semibold capitalize text-foreground">
        {periodLabel}
      </h2>

      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        {showViewToggle && onViewChange && (
          <ToggleGroup 
            type="single" 
            value={view} 
            onValueChange={(value) => value && onViewChange(value as CalendarViewType)}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem 
              value="month" 
              aria-label="Visualização mensal" 
              className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Mês</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="week" 
              aria-label="Visualização semanal" 
              className="gap-1.5 px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <CalendarRange className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Semana</span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="text-sm"
          >
            Hoje
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToPrevious}
            aria-label={view === 'month' ? 'Mês anterior' : 'Semana anterior'}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToNext}
            aria-label={view === 'month' ? 'Próximo mês' : 'Próxima semana'}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
