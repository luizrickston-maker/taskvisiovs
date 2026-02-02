import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import type { Script, ScriptPlatform, ScriptStatus } from '@/types/database';

const platformColors: Record<ScriptPlatform, string> = {
  youtube: 'bg-platform-youtube',
  youtube_shorts: 'bg-platform-youtube/80',
  tiktok: 'bg-platform-tiktok',
  tiktok_ads: 'bg-platform-tiktok/80',
  instagram_reels: 'bg-platform-instagram',
  instagram_post: 'bg-platform-instagram/80',
  instagram_boost: 'bg-priority-high',
  facebook_ads: 'bg-platform-facebook',
};

const statusBorders: Record<ScriptStatus, string> = {
  draft: 'border-l-status-draft',
  scheduled: 'border-l-status-scheduled',
  published: 'border-l-status-published',
};

interface ContentCalendarProps {
  onSelectScript: (script: Script) => void;
  platformFilter: string;
  statusFilter: string;
}

export function ContentCalendar({ onSelectScript, platformFilter, statusFilter }: ContentCalendarProps) {
  const { scripts } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const filteredScripts = useMemo(() => {
    return scripts.filter(script => {
      if (platformFilter !== 'all' && script.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && script.status !== statusFilter) return false;
      return true;
    });
  }, [scripts, platformFilter, statusFilter]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getScriptsForDay = (day: Date) => {
    return filteredScripts.filter(script => 
      isSameDay(new Date(script.scheduled_date), day)
    );
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before the first day of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <div key={`empty-${index}`} className="min-h-[80px] md:min-h-[100px]" />
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dayScripts = getScriptsForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[80px] md:min-h-[100px] p-1 border border-border/50 rounded-lg transition-colors",
                isToday && "bg-primary/5 border-primary/30"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 text-center",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayScripts.slice(0, 3).map(script => (
                  <button
                    key={script.id}
                    onClick={() => onSelectScript(script)}
                    className={cn(
                      "w-full text-left text-[10px] md:text-xs p-1 rounded border-l-2 bg-background/80 hover:bg-muted/50 transition-colors truncate",
                      statusBorders[script.status]
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", platformColors[script.platform])} />
                      <span className="truncate">{script.title}</span>
                    </div>
                  </button>
                ))}
                {dayScripts.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{dayScripts.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 border-l-2 border-status-draft" /> Rascunho
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 border-l-2 border-status-scheduled" /> Agendado
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 border-l-2 border-status-published" /> Publicado
          </span>
        </div>
      </div>
    </div>
  );
}
