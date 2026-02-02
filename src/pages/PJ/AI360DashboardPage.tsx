import { useState } from 'react';
import { Brain, TrendingUp, FolderKanban, CheckSquare, Calendar, FileText, Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAI360Context, useAIAgents } from '@/hooks/useAI360Agent';
import { AI360ChatInterface } from '@/components/ai/AI360ChatInterface';
import { formatCurrency } from '@/lib/currency';

export default function AI360DashboardPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  
  const { data: context, isLoading: isLoadingContext } = useAI360Context();
  const { data: agents, isLoading: isLoadingAgents } = useAIAgents();

  // Set default agent when agents load
  const defaultAgent = agents?.find(a => a.is_default);
  const currentAgentId = selectedAgentId ?? defaultAgent?.id;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Cérebro Operacional</h1>
              <p className="text-sm text-muted-foreground">
                Assistente de IA 360° para suas operações
              </p>
            </div>
          </div>

          {/* Agent Selector */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <Select
              value={currentAgentId}
              onValueChange={setSelectedAgentId}
              disabled={isLoadingAgents}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecionar agente..." />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      {agent.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Projetos Ativos"
            icon={FolderKanban}
            iconColor="text-blue-500"
            isLoading={isLoadingContext}
            value={context?.projects?.total ?? 0}
            subtitle={`${context?.projects?.overdue_count ?? 0} atrasados`}
            subtitleColor={context?.projects?.overdue_count ? 'text-destructive' : undefined}
          />
          <KPICard
            title="Pipeline de Vendas"
            icon={TrendingUp}
            iconColor="text-emerald-500"
            isLoading={isLoadingContext}
            value={formatCurrency(context?.sales_pipeline?.total_value ?? 0)}
            subtitle={`${context?.sales_pipeline?.total_prospects ?? 0} prospects ativos`}
          />
          <KPICard
            title="Tarefas Pendentes"
            icon={CheckSquare}
            iconColor="text-amber-500"
            isLoading={isLoadingContext}
            value={context?.tasks?.total_pending ?? 0}
            subtitle={`${context?.tasks?.overdue_count ?? 0} atrasadas`}
            subtitleColor={context?.tasks?.overdue_count ? 'text-destructive' : undefined}
          />
          <KPICard
            title="Compromissos Hoje"
            icon={Calendar}
            iconColor="text-violet-500"
            isLoading={isLoadingContext}
            value={context?.schedule?.today ?? 0}
            subtitle={`${context?.schedule?.this_week ?? 0} esta semana`}
          />
        </div>

        {/* Secondary Stats Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Calendário Editorial
              </CardTitle>
              <FileText className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              {isLoadingContext ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {context?.editorial?.total_pending ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    conteúdos pendentes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {context?.editorial?.by_platform && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          IG: {context.editorial.by_platform.instagram}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          TT: {context.editorial.by_platform.tiktok}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          YT: {context.editorial.by_platform.youtube}
                        </Badge>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Equipe Disponível
              </CardTitle>
              <Users className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              {isLoadingContext ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {context?.team?.active_members ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    membros ativos
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-primary">
                      {context?.team?.total_hours_available ?? 0}h
                    </span>
                    <span className="text-muted-foreground"> disponíveis</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Metas de Vendas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoadingContext ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {context?.sales_goals?.length ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    metas ativas
                  </p>
                  {context?.sales_goals?.[0] && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progresso:</span>
                        <span className="font-medium">
                          {context.sales_goals[0].progress_percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${Math.min(context.sales_goals[0].progress_percent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Chat Interface */}
      <AI360ChatInterface agentId={currentAgentId} />
    </div>
  );
}

// =====================================================
// KPI Card Component
// =====================================================

interface KPICardProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  value: string | number;
  subtitle: string;
  subtitleColor?: string;
  isLoading?: boolean;
}

function KPICard({
  title,
  icon: Icon,
  iconColor,
  value,
  subtitle,
  subtitleColor,
  isLoading,
}: KPICardProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className={`text-xs ${subtitleColor ?? 'text-muted-foreground'}`}>
              {subtitle}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
