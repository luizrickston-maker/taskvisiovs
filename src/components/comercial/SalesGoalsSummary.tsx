import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, TrendingUp, Users, Trash2, FolderOpen } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SalesGoalType } from '@/types/database';

const goalTypeConfig: Record<SalesGoalType, { label: string; icon: typeof Target; colorClass: string }> = {
  faturamento_mensal: { label: 'Faturamento Mensal', icon: TrendingUp, colorClass: 'text-success' },
  vendas_fechadas: { label: 'Vendas Fechadas', icon: Target, colorClass: 'text-primary' },
  novos_clientes: { label: 'Novos Clientes', icon: Users, colorClass: 'text-warning' },
};

type PeriodFilter = 'all' | 'today' | 'week' | 'month';

interface SalesGoalsSummaryProps {
  onAddGoal: () => void;
}

export function SalesGoalsSummary({ onAddGoal }: SalesGoalsSummaryProps) {
  const { salesGoals, projects, deleteSalesGoal } = useAppStore();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  
  const filteredGoals = useMemo(() => {
    const today = new Date();
    
    // First filter by active goals (date range includes today)
    const activeGoals = salesGoals.filter(goal => {
      try {
        const start = parseISO(goal.start_date);
        const end = parseISO(goal.end_date);
        return isWithinInterval(today, { start, end });
      } catch {
        return false;
      }
    });

    // Then filter by period
    if (periodFilter === 'all') return activeGoals;

    return activeGoals.filter(goal => {
      try {
        const goalStart = parseISO(goal.start_date);
        const goalEnd = parseISO(goal.end_date);
        
        let periodStart: Date;
        let periodEnd: Date;
        
        switch (periodFilter) {
          case 'today':
            periodStart = startOfDay(today);
            periodEnd = endOfDay(today);
            break;
          case 'week':
            periodStart = startOfWeek(today, { locale: ptBR });
            periodEnd = endOfWeek(today, { locale: ptBR });
            break;
          case 'month':
            periodStart = startOfMonth(today);
            periodEnd = endOfMonth(today);
            break;
          default:
            return true;
        }
        
        // Check if goal period overlaps with selected period
        return goalStart <= periodEnd && goalEnd >= periodStart;
      } catch {
        return false;
      }
    });
  }, [salesGoals, periodFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.project || null;
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase.from('sales_goals').delete().eq('id', id);
      if (error) throw error;
      deleteSalesGoal(id);
      toast.success('Meta excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao excluir meta');
    }
  };

  if (filteredGoals.length === 0 && periodFilter === 'all') {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <Target className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Nenhuma meta ativa no momento
          </p>
          <Button onClick={onAddGoal} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Meta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filtrar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Ativas</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
            <Target className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Nenhuma meta encontrada para este período
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => {
            const config = goalTypeConfig[goal.goal_type];
            const Icon = config.icon;
            const percentage = goal.target_amount > 0 
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) 
              : 0;
            const isCompleted = percentage >= 100;
            const projectName = getProjectName(goal.project_id);
            
            return (
              <Card key={goal.id} className="glass-card animate-fade-in relative group">
                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Icon className={`w-5 h-5 ${config.colorClass}`} />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-bold">
                        {goal.goal_type === 'novos_clientes' 
                          ? goal.current_amount.toFixed(0)
                          : formatCurrency(goal.current_amount)
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        de {goal.goal_type === 'novos_clientes' 
                          ? goal.target_amount.toFixed(0)
                          : formatCurrency(goal.target_amount)
                        }
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${isCompleted ? 'text-success' : percentage >= 75 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${isCompleted ? '[&>div]:bg-success' : percentage >= 75 ? '[&>div]:bg-warning' : ''}`}
                  />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Até {format(parseISO(goal.end_date), "dd 'de' MMM", { locale: ptBR })}</span>
                    {projectName && (
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {projectName}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          <Card className="glass-card border-dashed flex items-center justify-center min-h-[140px] cursor-pointer hover:bg-accent/50 transition-colors" onClick={onAddGoal}>
            <CardContent className="flex flex-col items-center gap-2 py-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nova Meta</span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
