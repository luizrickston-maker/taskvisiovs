import { 
  FolderKanban, 
  TrendingUp, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Users,
  AlertTriangle,
  Clock,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { AI360ContextSummary } from '@/types/ai';
import { formatCurrency } from '@/lib/currency';

interface AI360SummaryCardsProps {
  summary: AI360ContextSummary | null | undefined;
  isLoading?: boolean;
}

export function AI360SummaryCards({ summary, isLoading }: AI360SummaryCardsProps) {
  if (isLoading) {
    return <SummaryCardsSkeleton />;
  }

  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Não foi possível carregar o resumo operacional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Projetos Ativos"
          icon={FolderKanban}
          iconBg="bg-kpi-projects/10"
          iconColor="text-kpi-projects"
          value={summary.projects?.total ?? 0}
          trend={summary.projects?.by_status?.progress ?? 0}
          trendLabel="em progresso"
          alert={summary.projects?.overdue_count}
          alertLabel="atrasados"
        />
        
        <KPICard
          title="Pipeline de Vendas"
          icon={TrendingUp}
          iconBg="bg-kpi-sales/10"
          iconColor="text-kpi-sales"
          value={formatCurrency(summary.sales_pipeline?.total_value ?? 0)}
          trend={summary.sales_pipeline?.total_prospects ?? 0}
          trendLabel="prospects ativos"
          subtitle={`Ponderado: ${formatCurrency(summary.sales_pipeline?.weighted_value ?? 0)}`}
        />
        
        <KPICard
          title="Tarefas Pendentes"
          icon={CheckSquare}
          iconBg="bg-kpi-tasks/10"
          iconColor="text-kpi-tasks"
          value={summary.tasks?.total_pending ?? 0}
          trend={summary.tasks?.due_today ?? 0}
          trendLabel="para hoje"
          alert={summary.tasks?.overdue_count}
          alertLabel="atrasadas"
        />
        
        <KPICard
          title="Agenda Hoje"
          icon={Calendar}
          iconBg="bg-kpi-calendar/10"
          iconColor="text-kpi-calendar"
          value={summary.schedule?.today ?? 0}
          trend={summary.schedule?.tomorrow ?? 0}
          trendLabel="amanhã"
          subtitle={`${summary.schedule?.this_week ?? 0} esta semana`}
        />
      </div>

      {/* Detailed Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Projects Breakdown */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="h-4 w-4 text-kpi-projects" />
              Projetos por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusBar
              label="A Fazer"
              value={summary.projects?.by_status?.todo ?? 0}
              total={summary.projects?.total ?? 1}
              color="bg-muted-foreground"
            />
            <StatusBar
              label="Em Progresso"
              value={summary.projects?.by_status?.progress ?? 0}
              total={summary.projects?.total ?? 1}
              color="bg-status-progress"
            />
            <StatusBar
              label="Bloqueado"
              value={summary.projects?.by_status?.blocked ?? 0}
              total={summary.projects?.total ?? 1}
              color="bg-destructive"
            />
            <StatusBar
              label="Concluído"
              value={summary.projects?.by_status?.done ?? 0}
              total={summary.projects?.total ?? 1}
              color="bg-success"
            />
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Corporativos</span>
                <Badge variant="secondary">{summary.projects?.corporate_count ?? 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Pipeline */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-kpi-sales" />
              Funil de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusBar
              label="Novo"
              value={summary.sales_pipeline?.by_status?.novo ?? 0}
              total={summary.sales_pipeline?.total_prospects ?? 1}
              color="bg-muted-foreground"
            />
            <StatusBar
              label="Em Negociação"
              value={summary.sales_pipeline?.by_status?.em_negociacao ?? 0}
              total={summary.sales_pipeline?.total_prospects ?? 1}
              color="bg-warning"
            />
            <StatusBar
              label="Proposta Enviada"
              value={summary.sales_pipeline?.by_status?.proposta_enviada ?? 0}
              total={summary.sales_pipeline?.total_prospects ?? 1}
              color="bg-status-progress"
            />
            <StatusBar
              label="Fechado"
              value={summary.sales_pipeline?.by_status?.fechado ?? 0}
              total={summary.sales_pipeline?.total_prospects ?? 1}
              color="bg-success"
            />
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor Fechado</span>
                <span className="font-medium text-success">
                  {formatCurrency(summary.sales_pipeline?.closed_value ?? 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Overview */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-kpi-tasks" />
              Visão de Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat
                icon={Clock}
                label="A Fazer"
                value={summary.tasks?.by_status?.todo ?? 0}
                color="text-muted-foreground"
              />
              <MiniStat
                icon={Zap}
                label="Em Progresso"
                value={summary.tasks?.by_status?.in_progress ?? 0}
                color="text-status-progress"
              />
              <MiniStat
                icon={AlertTriangle}
                label="Atrasadas"
                value={summary.tasks?.overdue_count ?? 0}
                color="text-destructive"
              />
              <MiniStat
                icon={Target}
                label="Alta Prioridade"
                value={summary.tasks?.high_priority ?? 0}
                color="text-kpi-tasks"
              />
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Esta Semana</span>
                <Badge variant="outline">{summary.tasks?.due_this_week ?? 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editorial Calendar */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-kpi-editorial" />
              Calendário Editorial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="bg-platform-instagram/10 text-platform-instagram">
                IG: {summary.editorial?.by_platform?.instagram ?? 0}
              </Badge>
              <Badge variant="outline" className="bg-platform-tiktok/10 text-platform-tiktok">
                TT: {summary.editorial?.by_platform?.tiktok ?? 0}
              </Badge>
              <Badge variant="outline" className="bg-platform-youtube/10 text-platform-youtube">
                YT: {summary.editorial?.by_platform?.youtube ?? 0}
              </Badge>
              <Badge variant="outline" className="bg-platform-linkedin/10 text-platform-linkedin">
                LI: {summary.editorial?.by_platform?.linkedin ?? 0}
              </Badge>
              <Badge variant="outline" className="bg-platform-blog/10 text-platform-blog">
                Blog: {summary.editorial?.by_platform?.blog ?? 0}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ideias</span>
                <span>{summary.editorial?.by_status?.idea ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rascunhos</span>
                <span>{summary.editorial?.by_status?.draft ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Em Revisão</span>
                <span>{summary.editorial?.by_status?.review ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aprovados</span>
                <span className="text-success">{summary.editorial?.by_status?.approved ?? 0}</span>
              </div>
            </div>
            {(summary.editorial?.overdue_count ?? 0) > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.editorial?.overdue_count} atrasados
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-kpi-team" />
              Equipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{summary.team?.active_members ?? 0}</span>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Membros ativos</div>
                <div className="text-lg font-semibold text-primary">
                  {summary.team?.total_hours_available ?? 0}h
                </div>
                <div className="text-xs text-muted-foreground">disponíveis</div>
              </div>
            </div>
            {(summary.team?.members?.length ?? 0) > 0 && (
              <div className="pt-2 border-t space-y-2">
                {summary.team?.members?.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{member.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {member.hours_available}h
                    </Badge>
                  </div>
                ))}
                {(summary.team?.members?.length ?? 0) > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{(summary.team?.members?.length ?? 0) - 3} mais
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Goals */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-kpi-sales" />
              Metas de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(summary.sales_goals?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma meta ativa
              </p>
            ) : (
              summary.sales_goals?.slice(0, 3).map((goal) => (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{goal.goal_type.replace('_', ' ')}</span>
                    <Badge
                      variant={goal.status === 'on_track' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {goal.days_remaining}d
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(goal.progress_percent, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(goal.current_amount)}</span>
                    <span>{goal.progress_percent.toFixed(0)}%</span>
                    <span>{formatCurrency(goal.target_amount)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =====================================================
// Sub-components
// =====================================================

interface KPICardProps {
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  alert?: number;
  alertLabel?: string;
}

function KPICard({
  title,
  icon: Icon,
  iconBg,
  iconColor,
  value,
  trend,
  trendLabel,
  subtitle,
  alert,
  alertLabel,
}: KPICardProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          {trend !== undefined && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{trend}</span> {trendLabel}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {alert !== undefined && alert > 0 && (
            <Badge variant="destructive" className="text-xs">
              {alert} {alertLabel}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function StatusBar({ label, value, total, color }: StatusBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface MiniStatProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

function MiniStat({ icon: Icon, label, value, color }: MiniStatProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <div className="text-lg font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
