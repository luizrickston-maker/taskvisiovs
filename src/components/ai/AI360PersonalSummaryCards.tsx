import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet,
  CreditCard,
  CheckSquare,
  Calendar,
  Target,
  FolderKanban,
  FileText,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import type { PersonalContextSummary } from '@/hooks/usePersonalAI360Agent';
import { formatCurrency, calculateFinancialHealth, getPersonalAlerts } from '@/hooks/usePersonalAI360Agent';

interface AI360PersonalSummaryCardsProps {
  summary: PersonalContextSummary | null | undefined;
  isLoading: boolean;
}

export function AI360PersonalSummaryCards({ summary, isLoading }: AI360PersonalSummaryCardsProps) {
  const navigate = useNavigate();

  const financialHealth = useMemo(() => calculateFinancialHealth(summary ?? null), [summary]);
  const alerts = useMemo(() => getPersonalAlerts(summary ?? null), [summary]);

  if (isLoading) {
    return <SummaryCardsSkeleton />;
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Não foi possível carregar o contexto pessoal.</p>
      </div>
    );
  }

  const { finances, debts, tasks, schedule, goals, projects, scripts, purchase_plans } = summary;

  return (
    <div className="space-y-6">
      {/* Priority Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas Prioritários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm ${
                  alert.type === 'danger' ? 'text-destructive' : 
                  alert.type === 'warning' ? 'text-amber-500' : 'text-muted-foreground'
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-current" />
                {alert.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Financial Health Score */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Saúde Financeira
            </span>
            <Badge variant={financialHealth >= 70 ? 'default' : financialHealth >= 40 ? 'secondary' : 'destructive'}>
              {financialHealth}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={financialHealth} className="h-2" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                Receitas
              </div>
              <p className="font-semibold text-emerald-500">
                {formatCurrency(finances?.income_this_month ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-rose-500" />
                Despesas
              </div>
              <p className="font-semibold text-rose-500">
                {formatCurrency(finances?.expenses_this_month ?? 0)}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saldo do Mês</span>
            <span className={`font-bold ${(finances?.balance_this_month ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {formatCurrency(finances?.balance_this_month ?? 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grid of KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Debts Card */}
        <KPICard
          icon={CreditCard}
          iconColor="text-rose-500"
          title="Contas a Pagar"
          value={formatCurrency(debts?.total_amount ?? 0)}
          subtitle={`${debts?.total_pending ?? 0} pendentes`}
          badge={debts?.overdue_count ? { text: `${debts.overdue_count} atrasadas`, variant: 'destructive' as const } : undefined}
          onClick={() => navigate('/caixa')}
        />

        {/* Tasks Card */}
        <KPICard
          icon={CheckSquare}
          iconColor="text-amber-500"
          title="Tarefas"
          value={`${tasks?.today_count ?? 0} para hoje`}
          subtitle={`${tasks?.total_pending ?? 0} pendentes total`}
          badge={tasks?.overdue_count ? { text: `${tasks.overdue_count} atrasadas`, variant: 'destructive' as const } : undefined}
          onClick={() => navigate('/foco')}
        />

        {/* Schedule Card */}
        <KPICard
          icon={Calendar}
          iconColor="text-violet-500"
          title="Agenda"
          value={`${schedule?.today ?? 0} compromissos hoje`}
          subtitle={`${schedule?.total_upcoming ?? 0} próximos 14 dias`}
          onClick={() => navigate('/foco')}
        />

        {/* Goals Card */}
        <KPICard
          icon={Target}
          iconColor="text-blue-500"
          title="Metas"
          value={`${goals?.total_active ?? 0} ativas`}
          subtitle={goals?.items?.[0] ? `Top: ${goals.items[0].name}` : 'Nenhuma meta'}
          badge={goals?.overdue_count ? { text: `${goals.overdue_count} atrasadas`, variant: 'destructive' as const } : undefined}
          onClick={() => navigate('/planejamento')}
        />

        {/* Projects Card */}
        <KPICard
          icon={FolderKanban}
          iconColor="text-cyan-500"
          title="Projetos"
          value={`${projects?.total ?? 0} projetos`}
          subtitle={`${projects?.by_status?.progress ?? 0} em progresso`}
          onClick={() => navigate('/projetos')}
        />

        {/* Scripts Card */}
        <KPICard
          icon={FileText}
          iconColor="text-pink-500"
          title="Roteiros"
          value={`${scripts?.total_pending ?? 0} pendentes`}
          subtitle={`${scripts?.today_count ?? 0} para hoje`}
          badge={scripts?.overdue_count ? { text: `${scripts.overdue_count} atrasados`, variant: 'destructive' as const } : undefined}
          onClick={() => navigate('/roteiros')}
        />
      </div>

      {/* Purchase Plans Section */}
      {(purchase_plans?.total_active ?? 0) > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-purple-500" />
                Planos de Compra
              </span>
              <Badge variant="outline" className="text-purple-500">
                {purchase_plans?.total_active ?? 0} ativos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso Geral</span>
              <span className="font-medium">
                {formatCurrency(purchase_plans?.total_saved ?? 0)} / {formatCurrency(purchase_plans?.total_target ?? 0)}
              </span>
            </div>
            <Progress 
              value={purchase_plans?.total_target ? ((purchase_plans?.total_saved ?? 0) / purchase_plans.total_target) * 100 : 0} 
              className="h-2" 
            />
            
            {purchase_plans?.items && purchase_plans.items.length > 0 && (
              <div className="space-y-2 pt-2">
                {purchase_plans.items.slice(0, 3).map((plan: any) => (
                  <div key={plan.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 mr-2">{plan.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {Number(plan.progress_percent ?? 0).toFixed(0)}%
                      </span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all" 
                          style={{ width: `${Math.min(100, plan.progress_percent ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/planejamento')}
              className="w-full flex items-center justify-center gap-1 text-sm text-primary hover:underline pt-2"
            >
              Ver todos os planos
              <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =====================================================
// KPI Card Component
// =====================================================

interface KPICardProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: string;
  subtitle: string;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
  onClick?: () => void;
}

function KPICard({ icon: Icon, iconColor, title, value, subtitle, badge, onClick }: KPICardProps) {
  return (
    <Card 
      className={`glass-card transition-all ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg bg-muted ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-lg font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Skeleton Loader
// =====================================================

function SummaryCardsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}
