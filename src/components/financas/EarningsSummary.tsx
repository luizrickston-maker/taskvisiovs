import { useMemo } from 'react';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';

export function EarningsSummary() {
  const { incomes, expenses } = useAppStore();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const summary = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    const calcNet = (start: Date) => {
      const totalIncome = incomes
        .filter((i) => isAfter(parseISO(i.date), start) || parseISO(i.date).getTime() === start.getTime())
        .reduce((acc, i) => acc + Number(i.amount), 0);

      const totalExpense = expenses
        .filter((e) => isAfter(parseISO(e.date), start) || parseISO(e.date).getTime() === start.getTime())
        .reduce((acc, e) => acc + Number(e.amount), 0);

      return totalIncome - totalExpense;
    };

    return {
      daily: calcNet(todayStart),
      weekly: calcNet(weekStart),
      monthly: calcNet(monthStart),
    };
  }, [incomes, expenses]);

  const cards = [
    {
      title: 'Hoje',
      value: summary.daily,
      icon: Calendar,
    },
    {
      title: 'Esta Semana',
      value: summary.weekly,
      icon: CalendarDays,
    },
    {
      title: 'Este Mês',
      value: summary.monthly,
      icon: CalendarRange,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="glass-card animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <card.icon className="w-4 h-4" />
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                card.value >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {card.value >= 0 ? '+' : ''}
              {formatCurrency(card.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
