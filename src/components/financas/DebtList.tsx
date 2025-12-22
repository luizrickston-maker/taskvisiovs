import { CreditCard, Trash2, Edit2, Check, X, AlertTriangle, RefreshCw, MoreVertical } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DebtForm } from './DebtForm';
import type { Debt } from '@/types/database';

export function DebtList() {
  const { debts, categories, updateDebt, deleteDebt } = useAppStore();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleTogglePaid = async (debt: Debt) => {
    const newPaidStatus = !debt.paid;
    updateDebt(debt.id, { paid: newPaidStatus });

    const { error } = await supabase
      .from('debts')
      .update({ paid: newPaidStatus })
      .eq('id', debt.id);

    if (error) {
      updateDebt(debt.id, { paid: debt.paid });
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    deleteDebt(id);
    const { error } = await supabase.from('debts').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover dívida');
    } else {
      toast.success('Dívida removida');
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'Fixa';
      case 'installment':
        return 'Parcelada';
      default:
        return 'Variável';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fixed':
        return <RefreshCw className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const isOverdue = (debt: Debt): boolean => {
    if (debt.paid) return false;
    return isBefore(parseISO(debt.due_date), new Date());
  };

  const totalDebts = debts.reduce((acc, d) => acc + Number(d.amount), 0);
  const unpaidDebts = debts.filter((d) => !d.paid);
  const unpaidTotal = unpaidDebts.reduce((acc, d) => acc + Number(d.amount), 0);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-destructive" />
            Gerenciar Dívidas
          </CardTitle>
          <DebtForm />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted-foreground">
            Pendente: <span className="text-destructive font-medium">{formatCurrency(unpaidTotal)}</span>
          </span>
          <span className="text-muted-foreground">
            Total: <span className="font-medium">{formatCurrency(totalDebts)}</span>
          </span>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {debts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Check className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhuma dívida cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map((debt) => {
                const overdue = isOverdue(debt);
                const dueDate = parseISO(debt.due_date);

                return (
                  <div
                    key={debt.id}
                    className={`p-4 rounded-lg border transition-all ${
                      debt.paid
                        ? 'bg-muted/30 border-border/50 opacity-60'
                        : overdue
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={debt.paid}
                        onCheckedChange={() => handleTogglePaid(debt)}
                        className="mt-1 data-[state=checked]:bg-success data-[state=checked]:border-success"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${debt.paid ? 'line-through' : ''}`}>
                            {debt.name}
                          </p>
                          {overdue && !debt.paid && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="secondary"
                            className="text-xs gap-1"
                            style={{ borderColor: getCategoryColor(debt.category_id) }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(debt.category_id) }}
                            />
                            {getCategoryName(debt.category_id)}
                          </Badge>

                          <Badge variant="outline" className="text-xs gap-1">
                            {getTypeIcon(debt.type)}
                            {getTypeLabel(debt.type)}
                          </Badge>

                          {debt.type === 'installment' && debt.installment_current && debt.installment_total && (
                            <Badge variant="secondary" className="text-xs">
                              {debt.installment_current}/{debt.installment_total}
                            </Badge>
                          )}

                          <span>
                            Vence {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        </div>

                        {debt.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {debt.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${overdue && !debt.paid ? 'text-destructive' : ''}`}>
                          {formatCurrency(Number(debt.amount))}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(debt.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
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
      </CardContent>
    </Card>
  );
}
