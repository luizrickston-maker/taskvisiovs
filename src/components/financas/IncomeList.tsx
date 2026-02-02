import { useState, useMemo } from 'react';
import { Wallet, Trash2, Edit2, TrendingUp, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IncomeForm } from './IncomeForm';
import type { Income } from '@/types/database';

export function IncomeList() {
  const { incomes, categories, deleteIncome } = useAppStore();
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover ganho');
    } else {
      deleteIncome(id);
      toast.success('Ganho removido');
    }
  };

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const getCategoryName = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  // Sort incomes by date (most recent first)
  const sortedIncomes = useMemo(() => {
    return [...incomes].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [incomes]);

  const totalIncomes = incomes.reduce((acc, i) => acc + Number(i.amount), 0);

  // Group incomes by category for summary
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    incomes.forEach((income) => {
      const key = income.category_id || 'sem-categoria';
      totals[key] = (totals[key] || 0) + Number(income.amount);
    });
    return totals;
  }, [incomes]);

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
            {Object.entries(categoryTotals).map(([catId, total]) => {
              const category = categories.find(c => c.id === catId);
              return (
                <Badge 
                  key={catId} 
                  variant="secondary" 
                  className="text-xs"
                  style={{ borderColor: category?.color || '#6b7280' }}
                >
                  <div
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: category?.color || '#6b7280' }}
                  />
                  {category?.name || 'Sem categoria'}: {formatCurrency(total)}
                </Badge>
              );
            })}
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

                return (
                  <div
                    key={income.id}
                    className="p-4 rounded-lg border bg-card border-border hover:border-success/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{income.source}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="text-xs gap-1"
                            style={{ borderColor: getCategoryColor(income.category_id) }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(income.category_id) }}
                            />
                            {getCategoryName(income.category_id)}
                          </Badge>

                          <span>
                            {format(incomeDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-success">
                          {formatCurrency(Number(income.amount))}
                        </span>

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
                          <DropdownMenuContent align="end">
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
