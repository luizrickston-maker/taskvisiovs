import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Target, TrendingUp, Users, Trash2, FolderOpen, CalendarIcon, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  const { salesGoals, projects, deleteSalesGoal } = useAppStore();
  
  // New filter states
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(undefined);
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(undefined);
  
  const hasActiveFilters = typeFilter !== 'all' || projectFilter !== 'all' || startDateFilter || endDateFilter;
  
  const clearFilters = () => {
    setTypeFilter('all');
    setProjectFilter('all');
    setStartDateFilter(undefined);
    setEndDateFilter(undefined);
  };
  
  const filteredGoals = useMemo(() => {
    return salesGoals.filter(goal => {
      // 1. Filter by type
      if (typeFilter !== 'all' && goal.goal_type !== typeFilter) {
        return false;
      }
      
      // 2. Filter by project
      if (projectFilter !== 'all') {
        if (projectFilter === 'none' && goal.project_id !== null) {
          return false;
        } else if (projectFilter !== 'none' && goal.project_id !== projectFilter) {
          return false;
        }
      }
      
      // 3. Filter by date range
      try {
        const goalStart = parseISO(goal.start_date);
        const goalEnd = parseISO(goal.end_date);
        
        // If start date filter is set, goal must end after or on that date
        if (startDateFilter && goalEnd < startDateFilter) {
          return false;
        }
        
        // If end date filter is set, goal must start before or on that date
        if (endDateFilter && goalStart > endDateFilter) {
          return false;
        }
      } catch {
        return false;
      }
      
      return true;
    });
  }, [salesGoals, typeFilter, projectFilter, startDateFilter, endDateFilter]);

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

  if (filteredGoals.length === 0 && !hasActiveFilters) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <Target className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-center">
            Nenhuma meta cadastrada
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
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg">
        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo da Meta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="faturamento_mensal">Faturamento Mensal</SelectItem>
            <SelectItem value="vendas_fechadas">Vendas Fechadas</SelectItem>
            <SelectItem value="novos_clientes">Novos Clientes</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Project Filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            <SelectItem value="none">Sem projeto</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Start Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !startDateFilter && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDateFilter ? format(startDateFilter, 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDateFilter}
              onSelect={setStartDateFilter}
              initialFocus
              className="pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-muted-foreground text-sm">até</span>
        
        {/* End Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !endDateFilter && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDateFilter ? format(endDateFilter, 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDateFilter}
              onSelect={setEndDateFilter}
              initialFocus
              className="pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        
        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
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
