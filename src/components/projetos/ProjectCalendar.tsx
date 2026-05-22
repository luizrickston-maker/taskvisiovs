import { useMemo, useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ListTodo, Clock, CheckCircle2 } from 'lucide-react';
import type { ProjectTask, ProjectTaskStatus } from '@/types/database';

interface ProjectCalendarProps {
  tasks: ProjectTask[];
  onTaskClick?: (task: ProjectTask) => void;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const statusConfig: Record<ProjectTaskStatus, { color: string; icon: any }> = {
  todo: { color: 'bg-muted-foreground', icon: ListTodo },
  in_progress: { color: 'bg-status-scheduled', icon: Clock },
  done: { color: 'bg-success', icon: CheckCircle2 },
};

const priorityColors: Record<number, string> = {
  1: 'text-priority-critical',
  2: 'text-priority-high',
  3: 'text-priority-medium',
  4: 'text-priority-low',
  5: 'text-priority-minimal',
};

export default function ProjectCalendar({ tasks, onTaskClick }: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.deadline) return false;
      const taskDate = parseISO(task.deadline);
      return isSameDay(taskDate, day);
    });
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dayTasks = getTasksForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] p-1 border rounded-md transition-colors",
                !isCurrentMonth ? "bg-muted/30 text-muted-foreground/50 border-transparent" : "bg-card border-border/40",
                isCurrentDay && "border-primary/50 ring-1 ring-primary/20 shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-1 px-1">
                <span className={cn(
                  "text-xs font-medium",
                  isCurrentDay && "bg-primary text-primary-foreground w-5 h-5 flex items-center justify-center rounded-full"
                )}>
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => {
                  const StatusIcon = statusConfig[task.status].icon;
                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        "group cursor-pointer p-1 rounded text-[10px] border border-border/40 bg-background hover:bg-muted transition-colors truncate flex items-center gap-1",
                        task.status === 'done' && "opacity-60"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusConfig[task.status].color)} />
                      <span className={cn(
                        "truncate",
                        task.status === 'done' && "line-through"
                      )}>
                        {task.title}
                      </span>
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[9px] text-center text-muted-foreground">
                    + {dayTasks.length - 3} mais
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
