import { useState, useMemo } from 'react';
import { Wallet, Trash2, Edit2, TrendingUp, MoreVertical, RefreshCw, Repeat, LineChart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/useAppStore';
import { useUserIncomeCategories } from '@/hooks/useFinanceCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IncomeForm } from './IncomeForm';
import { formatCurrency } from '@/lib/currency';
import type { Income, IncomeType } from '@/types/database';

// =====================================================
// Configuração de tipos de ganho
// =====================================================

const INCOME_TYPE_CONFIG: Record<IncomeType, { label: string; icon: React.ElementType; color: string }> = {
  fixed: {
    label: 'Fixo',
    icon: Wallet,
    color: 'text-blue-500',
  },
  recurring: {
    label: 'Recorrente',
    icon: Repeat,
    color: 'text-purple-500',
  },
  variable: {
    label: 'Variável',
    icon: LineChart,
    color: 'text-amber-500',
  },
};

// =====================================================
// Componente
// =====================================================

export function IncomeList() {
  const { incomes, categories, deleteIncome } = useAppStore();
  const { data: userIncomeCategories = [] } = useUserIncomeCategories();
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover ganho');
    } else {
      deleteIncome(id);
      toast.success('Ganho removido');
    }
  };

  // Busca categoria do sistema
  const getSystemCategory = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId);
  };

  // Busca categoria customizada
  const getUserCategory = (userCategoryId?: string | null) => {
    if (!userCategoryId) return null;
    return userIncomeCategories.find((c) => c.id === userCategoryId);
  };

  // Retorna informações da categoria (sistema ou customizada)
  const getCategoryInfo = (income: Income) => {
    // Primeiro tenta categoria customizada
    const userCat = getUserCategory(income.user_category_id);
    if (userCat) {
      return {
        name: userCat.name,
        color: '#10b981', // Cor padrão para categorias customizadas (emerald-500)
        isCustom: true,
      };
    }

    // Depois tenta categoria do sistema
    const systemCat = getSystemCategory(income.category_id);
    if (systemCat) {
      return {
        name: systemCat.name,
        color: systemCat.color,
        isCustom: false,
      };
    }

    return {
      name: 'Sem categoria',
      color: '#6b7280',
      isCustom: false,
    };
  };

  // Sort incomes by date (most recent first)
  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [incomes]);

  const totalIncomes = incomes.reduce((acc, i) => acc + Number(i.amount), 0);

  // Group incomes by category for summary (combina sistema e customizadas)
  const categoryTotals = useMemo(() => {
    const totals: Record<string, { name: string; color: string; total: number }> = {};
    
    incomes.forEach((income) => {
      const catInfo = getCategoryInfo(income);
      const key = income.user_category_id || income.category_id || 'sem-categoria';
      
      if (!totals[key]) {
        totals[key] = { name: catInfo.name, color: catInfo.color, total: 0 };
      }
      totals[key].total += Number(income.amount);
    });
    
    return totals;
  }, [incomes, categories, userIncomeCategories]);

  // Renderiza o tipo de ganho
  const renderIncomeType = (income: Income) => {
    const incomeType = income.income_type || 'fixed';
    const config = INCOME_TYPE_CONFIG[incomeType];
    const Icon = config.icon;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`text-xs gap-1 ${config.color}`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {incomeType === 'fixed' && 'Ganho único e determinado'}
            {incomeType === 'recurring' && 'Ganho que se repete periodicamente'}
            {incomeType === 'variable' && 'Ganho com valor variável'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Renderiza faixa de valores para ganhos variáveis
  const renderVariableRange = (income: Income) => {
    if (income.income_type !== 'variable') return null;
    
    const hasMin = income.variable_min_amount != null && income.variable_min_amount > 0;
    const hasMax = income.variable_max_amount != null && income.variable_max_amount > 0;

    if (!hasMin && !hasMax) return null;

    let rangeText = '';
    if (hasMin && hasMax) {
      rangeText = `Entre ${formatCurrency(income.variable_min_amount!)} e ${formatCurrency(income.variable_max_amount!)}`;
    } else if (hasMin) {
      rangeText = `Mínimo: ${formatCurrency(income.variable_min_amount!)}`;
    } else if (hasMax) {
      rangeText = `Máximo: ${formatCurrency(income.variable_max_amount!)}`;
    }

    return (
      <span className="text-xs text-amber-600 dark:text-amber-400">
        {rangeText}
      </span>
    );
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="w-5 h-5 text-success" />
            Gerenciar Ganhos
          </CardTitle>
          <IncomeForm />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted-foreground">
            Total: <span className="text-success font-medium">{formatCurrency(totalIncomes)}</span>
          </span>
          <span className="text-muted-foreground">
            {incomes.length} {incomes.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {/* Category Summary Pills */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(categoryTotals).map(([catId, data]) => (
              <Badge 
                key={catId} 
                variant="secondary" 
                className="text-xs"
                style={{ borderColor: data.color }}
              >
                <div
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: data.color }}
                />
                {data.name}: {formatCurrency(data.total)}
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="h-[400px] pr-4">
          {incomes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhum ganho cadastrado</p>
              <p className="text-xs mt-1">Adicione seus salários, freelances e outras receitas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedIncomes.map((income) => {
                const incomeDate = parseISO(income.date);
                const catInfo = getCategoryInfo(income);

                return (
                  <div
                    key={income.id}
                    className="p-4 rounded-lg border bg-card border-border hover:border-success/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium truncate">{income.source}</p>
                          {renderIncomeType(income)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="text-xs gap-1"
                            style={{ borderColor: catInfo.color }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: catInfo.color }}
                            />
                            {catInfo.name}
                            {catInfo.isCustom && (
                              <span className="opacity-60 ml-0.5">(custom)</span>
                            )}
                          </Badge>

                          <span>
                            {format(incomeDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </span>
                        </div>

                        {/* Faixa de valores variáveis */}
                        {income.income_type === 'variable' && (
                          <div className="mt-2">
                            {renderVariableRange(income)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-bold text-success block">
                            {formatCurrency(Number(income.amount))}
                          </span>
                          {income.income_type === 'variable' && (
                            <span className="text-xs text-muted-foreground">
                              valor esperado
                            </span>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              aria-label={`Opções para ganho ${income.source}`}
                            >
                              <MoreVertical className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50 bg-popover">
                            <DropdownMenuItem onClick={() => setEditingIncome(income)}>
                              <Edit2 className="w-4 h-4 mr-2" aria-hidden="true" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(income.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Edit Dialog */}
        <IncomeForm
          income={editingIncome || undefined}
          open={!!editingIncome}
          onOpenChange={(open) => !open && setEditingIncome(null)}
          onClose={() => setEditingIncome(null)}
        />
      </CardContent>
    </Card>
  );
}
