import { useMemo } from 'react';
import { Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import { startOfDay, subDays, isAfter, parseISO, isSameDay } from 'date-fns';
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
    const weekStart = subDays(todayStart, 7);
    const monthStart = subDays(todayStart, 30);

    const calcValues = (start: Date, isToday = false) => {
      let totalIncome = 0;
      let totalExpense = 0;

      if (isToday) {
        totalIncome = incomes
          .filter((i) => isSameDay(parseISO(i.date), now))
          .reduce((acc, i) => acc + Number(i.amount), 0);

        totalExpense = expenses
          .filter((e) => isSameDay(parseISO(e.date), now))
          .reduce((acc, e) => acc + Number(e.amount), 0);
      } else {
        totalIncome = incomes
          .filter((i) => {
            const d = parseISO(i.date);
            return isAfter(d, start) || isSameDay(d, start);
          })
          .reduce((acc, i) => acc + Number(i.amount), 0);

        totalExpense = expenses
          .filter((e) => {
            const d = parseISO(e.date);
            return isAfter(d, start) || isSameDay(d, start);
          })
          .reduce((acc, e) => acc + Number(e.amount), 0);
      }

      return { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense };
    };

    return {
      daily: calcValues(todayStart, true),
      weekly: calcValues(weekStart),
      monthly: calcValues(monthStart),
    };
  }, [incomes, expenses]);

  const cards = [
    {
      title: 'Hoje',
      data: summary.daily,
      icon: Calendar,
    },
    {
      title: 'Esta Semana',
      data: summary.weekly,
      icon: CalendarDays,
    },
    {
      title: 'Este Mês',
      data: summary.monthly,
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
          <CardContent className="space-y-1">
            <p
              className={`text-2xl font-bold ${
                card.data.net >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {card.data.net >= 0 ? '+' : ''}
              {formatCurrency(card.data.net)}
            </p>
            <p className="text-sm text-destructive">
              Gastos: {formatCurrency(card.data.expense)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
