import { SectionBoundary } from '@/components/SectionBoundary';
import { ShoppingBag, Target, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';
import { formatCurrency } from '@/lib/currency';
import { PurchasePlanList } from '@/components/planejamento/PurchasePlanList';
import { PurchasePlanForm } from '@/components/planejamento/PurchasePlanForm';
import { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PlanejamentoDashboard() {
  const { purchasePlans, savings } = useAppStore();

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalPlanned = purchasePlans.reduce((sum, p) => sum + Number(p.target_amount), 0);
    const totalSaved = purchasePlans.reduce((sum, p) => sum + Number(p.saved_amount), 0);
    const remaining = totalPlanned - totalSaved;
    const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount), 0);

    // Find closest deadline
    const plansWithDeadline = purchasePlans
      .filter(p => p.deadline && p.status !== 'completed')
      .sort((a, b) => {
        const dateA = a.deadline ? parseISO(a.deadline) : new Date(9999, 11, 31);
        const dateB = b.deadline ? parseISO(b.deadline) : new Date(9999, 11, 31);
        return dateA.getTime() - dateB.getTime();
      });
    
    const closestPlan = plansWithDeadline[0];
    const closestDeadline = closestPlan?.deadline 
      ? {
          name: closestPlan.name,
          date: format(parseISO(closestPlan.deadline), "dd 'de' MMM", { locale: ptBR }),
          daysLeft: differenceInDays(parseISO(closestPlan.deadline), new Date()),
        }
      : null;

    return { totalPlanned, totalSaved, remaining, totalSavings, closestDeadline };
  }, [purchasePlans, savings]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Planejamento de Compras</h1>
            <p className="text-sm text-muted-foreground">Organize suas metas de aquisição</p>
          </div>
        </div>
        <PurchasePlanForm />
      </div>

      {/* KPI Cards */}
      <SectionBoundary name="KPIs de Planejamento">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Planejado
              </CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalPlanned)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {purchasePlans.length} {purchasePlans.length === 1 ? 'meta' : 'metas'} ativas
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Economizado
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(kpis.totalSaved)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalPlanned > 0 
                  ? `${Math.round((kpis.totalSaved / kpis.totalPlanned) * 100)}% do objetivo`
                  : 'Nenhuma meta definida'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Falta Economizar
              </CardTitle>
              <Wallet className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(kpis.remaining)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Reservas disponíveis: {formatCurrency(kpis.totalSavings)}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meta Mais Próxima
              </CardTitle>
              <Calendar className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              {kpis.closestDeadline ? (
                <>
                  <div className="text-lg font-bold truncate" title={kpis.closestDeadline.name}>
                    {kpis.closestDeadline.name}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.closestDeadline.date} ({kpis.closestDeadline.daysLeft >= 0 
                      ? `${kpis.closestDeadline.daysLeft} dias restantes`
                      : 'Atrasada'})
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-muted-foreground">—</div>
                  <p className="text-xs text-muted-foreground mt-1">Nenhuma meta com prazo</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SectionBoundary>

      {/* Savings Info Card */}
      {kpis.totalSavings > 0 && kpis.remaining > 0 && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Você tem {formatCurrency(kpis.totalSavings)} em reservas
                </p>
                <p className="text-xs text-muted-foreground">
                  {kpis.totalSavings >= kpis.remaining 
                    ? 'Suas reservas são suficientes para cobrir todas as metas!'
                    : `Faltam ${formatCurrency(kpis.remaining - kpis.totalSavings)} para cobrir todas as metas`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Plans List */}
      <SectionBoundary name="Lista de Planos">
        <PurchasePlanList />
      </SectionBoundary>
    </div>
  );
}
