import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subDays, parseISO, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';
import { formatCurrency } from '@/lib/currency';

export function FinanceChart() {
  const { incomes, expenses } = useAppStore();

  const chartData = useMemo(() => {
    const days = 14;
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      
      const dayIncomes = incomes
        .filter((income) => isSameDay(parseISO(income.date), date))
        .reduce((acc, i) => acc + Number(i.amount), 0);

      const dayExpenses = expenses
        .filter((expense) => isSameDay(parseISO(expense.date), date))
        .reduce((acc, e) => acc + Number(e.amount), 0);

      data.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        entradas: dayIncomes,
        saidas: dayExpenses,
        saldo: dayIncomes - dayExpenses,
      });
    }

    return data;
  }, [incomes, expenses]);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          Fluxo de Caixa (14 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84.2%, 60.2%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 84.2%, 60.2%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="entradas"
                name="Entradas"
                stroke="hsl(142, 76%, 36%)"
                fillOpacity={1}
                fill="url(#colorEntradas)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="saidas"
                name="Saídas"
                stroke="hsl(0, 84.2%, 60.2%)"
                fillOpacity={1}
                fill="url(#colorSaidas)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
