import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Target, TrendingUp, Users } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SalesGoalType } from '@/types/database';

const goalTypeConfig: Record<SalesGoalType, { label: string; icon: typeof Target; colorClass: string }> = {
  faturamento_mensal: { label: 'Faturamento Mensal', icon: TrendingUp, colorClass: 'text-success' },
  vendas_fechadas: { label: 'Vendas Fechadas', icon: Target, colorClass: 'text-primary' },
  novos_clientes: { label: 'Novos Clientes', icon: Users, colorClass: 'text-warning' },
};

interface SalesGoalsSummaryProps {
  onAddGoal: () => void;
}

export function SalesGoalsSummary({ onAddGoal }: SalesGoalsSummaryProps) {
  const { salesGoals } = useAppStore();
  
  const activeGoals = useMemo(() => {
    const today = new Date();
    return salesGoals.filter(goal => {
      try {
        const start = parseISO(goal.start_date);
        const end = parseISO(goal.end_date);
        return isWithinInterval(today, { start, end });
      } catch {
        return false;
      }
    });
  }, [salesGoals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (activeGoals.length === 0) {
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activeGoals.map((goal) => {
        const config = goalTypeConfig[goal.goal_type];
        const Icon = config.icon;
        const percentage = goal.target_amount > 0 
          ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) 
          : 0;
        const isCompleted = percentage >= 100;
        
        return (
          <Card key={goal.id} className="glass-card animate-fade-in">
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
              
              <p className="text-xs text-muted-foreground">
                Até {format(parseISO(goal.end_date), "dd 'de' MMM", { locale: ptBR })}
              </p>
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
  );
}
