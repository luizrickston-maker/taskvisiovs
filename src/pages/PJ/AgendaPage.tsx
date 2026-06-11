import { useMemo } from 'react';
import { CalendarClock, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { AgendaPJ } from '@/components/agenda/AgendaPJ';
import { useTimeBlocks, hasConflict } from '@/hooks/useAgendaPJ';

function useAgendaStats() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: todayBlocks = [] } = useTimeBlocks(today, today);
  const { data: weekBlocks = [] } = useTimeBlocks(weekStart, weekEnd);

  return useMemo(() => {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = todayBlocks.filter(b => b.start_time > nowStr);
    const conflicts = weekBlocks.filter(b =>
      weekBlocks.some(o => o.id !== b.id && hasConflict(b, o))
    );
    return {
      todayTotal: todayBlocks.length,
      upcoming: upcoming.length,
      weekTotal: weekBlocks.length,
      conflicts: conflicts.length,
    };
  }, [todayBlocks, weekBlocks]);
}

export default function AgendaPage() {
  const stats = useAgendaStats();
  const weekdayLabel = format(new Date(), "EEEE", { locale: ptBR });

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CalendarClock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {weekdayLabel} · Gestão de compromissos e blocos de tempo
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarClock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayTotal}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Próximos hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CalendarDays className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.weekTotal}</p>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`glass-card ${stats.conflicts > 0 ? 'border-amber-400/40' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.conflicts > 0 ? 'bg-amber-500/10' : 'bg-muted'}`}>
                <AlertTriangle className={`w-4 h-4 ${stats.conflicts > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.conflicts}</p>
                <p className="text-xs text-muted-foreground">Conflitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Agenda Component */}
      <AgendaPJ />
    </div>
  );
}
