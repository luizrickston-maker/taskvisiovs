import { useMemo } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/stores/useAppStore';
import { formatCurrency } from '@/lib/currency';

export function ProgressMeter() {
  const { savings, goals } = useAppStore();

  const { totalSavings, activeGoal, goalAmount, progress } = useMemo(() => {
    const total = savings.reduce((acc, s) => acc + Number(s.amount), 0);
    const goal = goals.find((g) => g.type === 'savings') || goals[0];
    const amount = goal?.amount || 10000;
    const prog = Math.min((total / amount) * 100, 100);
    return { totalSavings: total, activeGoal: goal, goalAmount: amount, progress: prog };
  }, [savings, goals]);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5 text-primary" />
          Meta de Economia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold text-primary">{progress.toFixed(1)}%</span>
        </div>
        
        <div className="relative">
          <Progress value={progress} className="h-4" />
          <div 
            className="absolute top-0 left-0 h-4 rounded-full gradient-primary glow-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Guardado</p>
            <p className="text-lg font-bold text-success">{formatCurrency(totalSavings)}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
          <div className="space-y-1 text-right">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-lg font-bold">{formatCurrency(goalAmount)}</p>
          </div>
        </div>

        {activeGoal && (
          <p className="text-xs text-muted-foreground text-center">
            {activeGoal.name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
