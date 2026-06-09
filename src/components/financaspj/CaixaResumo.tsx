import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency';
import { useCaixaTransacoes, useContasPagar } from '@/hooks/useCaixaPJ';
import { startOfMonth, endOfMonth, format, isAfter, parseISO } from 'date-fns';

export function CaixaResumo() {
  const hoje = new Date();
  const inicioMes = format(startOfMonth(hoje), 'yyyy-MM-dd');
  const fimMes = format(endOfMonth(hoje), 'yyyy-MM-dd');

  const { data: transacoes = [] } = useCaixaTransacoes({ dataInicio: inicioMes, dataFim: fimMes });
  const { data: contasPagar = [] } = useContasPagar();

  const { totalEntradas, totalSaidas, saldo } = useMemo(() => {
    const entradas = transacoes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0);
    const saidas = transacoes.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0);
    return { totalEntradas: entradas, totalSaidas: saidas, saldo: entradas - saidas };
  }, [transacoes]);

  const { totalPendente, totalVencido } = useMemo(() => {
    const pendentes = contasPagar.filter(c => c.status === 'pendente');
    const vencidas = contasPagar.filter(c => c.status === 'vencido');
    return {
      totalPendente: pendentes.reduce((s, c) => s + Number(c.valor), 0),
      totalVencido: vencidas.reduce((s, c) => s + Number(c.valor), 0),
    };
  }, [contasPagar]);

  const cards = [
    {
      title: 'Entradas do Mês',
      value: totalEntradas,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      title: 'Saídas do Mês',
      value: totalSaidas,
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
    },
    {
      title: 'Saldo do Mês',
      value: saldo,
      icon: Wallet,
      color: saldo >= 0 ? 'text-primary' : 'text-destructive',
      bg: saldo >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
      border: saldo >= 0 ? 'border-primary/20' : 'border-destructive/20',
    },
    {
      title: 'Contas a Pagar',
      value: totalPendente + totalVencido,
      icon: AlertCircle,
      color: totalVencido > 0 ? 'text-amber-500' : 'text-muted-foreground',
      bg: totalVencido > 0 ? 'bg-amber-500/10' : 'bg-muted/30',
      border: totalVencido > 0 ? 'border-amber-500/20' : 'border-border',
      subtitle: totalVencido > 0 ? `${formatCurrency(totalVencido)} vencido` : undefined,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={`glass-card border ${card.border}`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-1.5 rounded-md ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className={`text-xl font-bold ${card.color}`}>
              {formatCurrency(Math.abs(card.value))}
            </p>
            {card.subtitle && (
              <p className="text-xs text-amber-500 mt-0.5">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
