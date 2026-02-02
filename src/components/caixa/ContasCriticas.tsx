import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Check, CreditCard, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isBefore, parseISO, getDay, eachWeekOfInterval, isSameWeek, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Debt } from '@/types/database';

export function ContasCriticas() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { debts, categories, updateDebt } = useAppStore();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Filter debts for current month
  const monthDebts = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    return debts.filter((debt) => {
      const dueDate = parseISO(debt.due_date);

      // Fixed debts appear every month
      if (debt.type === 'fixed') {
        return true;
      }

      // Weekly debts: appear every week on the same day of week
      if (debt.type === 'weekly') {
        // Weekly debts always appear if they started before or during this month
        return isBefore(dueDate, endOfMonth(currentMonth)) || isSameMonth(dueDate, currentMonth);
      }

      // Installment debts: calculate which months they appear
      if (debt.type === 'installment' && debt.installment_current && debt.installment_total) {
        const originalMonth = startOfMonth(dueDate);
        const monthsDiff = Math.floor(
          (monthStart.getTime() - originalMonth.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const installmentForMonth = debt.installment_current + monthsDiff;
        return installmentForMonth >= 1 && installmentForMonth <= debt.installment_total;
      }

      // Variable debts: only in their due month
      return isSameMonth(dueDate, currentMonth);
    }).sort((a, b) => {
      const dateA = parseISO(a.due_date);
      const dateB = parseISO(b.due_date);
      // Weekly debts sort by day of week
      if (a.type === 'weekly' && b.type === 'weekly') {
        return getDay(dateA) - getDay(dateB);
      }
      return dateA.getDate() - dateB.getDate();
    });
  }, [debts, currentMonth]);

  const getInstallmentInfo = (debt: Debt): string | null => {
    if (debt.type !== 'installment' || !debt.installment_current || !debt.installment_total) {
      return null;
    }

    const dueDate = parseISO(debt.due_date);
    const originalMonth = startOfMonth(dueDate);
    const monthStart = startOfMonth(currentMonth);
    const monthsDiff = Math.floor(
      (monthStart.getTime() - originalMonth.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const installmentForMonth = debt.installment_current + monthsDiff;

    return `${installmentForMonth}/${debt.installment_total}`;
  };

  const isOverdue = (debt: Debt): boolean => {
    if (debt.paid) return false;
    const dueDate = parseISO(debt.due_date);
    const today = new Date();
    
    // For fixed debts, check if today is past the due day in current month
    if (debt.type === 'fixed') {
      const dueDayThisMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dueDate.getDate());
      return isBefore(dueDayThisMonth, today) && isSameMonth(currentMonth, today);
    }

    // For weekly debts, check if we're past this week's occurrence
    if (debt.type === 'weekly') {
      const dayOfWeek = getDay(dueDate); // 0 = Sunday, 5 = Friday, etc.
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const thisWeekOccurrence = new Date(weekStart);
      thisWeekOccurrence.setDate(weekStart.getDate() + dayOfWeek);
      return isBefore(thisWeekOccurrence, today) && isSameWeek(today, thisWeekOccurrence, { weekStartsOn: 0 });
    }
    
    return isBefore(dueDate, today);
  };

  const getDayOfWeekLabel = (dayOfWeek: number): string => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayOfWeek];
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

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const totalMonth = monthDebts.reduce((acc, d) => acc + Number(d.amount), 0);
  const paidTotal = monthDebts.filter((d) => d.paid).reduce((acc, d) => acc + Number(d.amount), 0);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-destructive" />
            Contas do Mês
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted-foreground">
            Pago: <span className="text-success font-medium">{formatCurrency(paidTotal)}</span>
          </span>
          <span className="text-muted-foreground">
            Total: <span className="font-medium">{formatCurrency(totalMonth)}</span>
          </span>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {monthDebts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Check className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhuma conta este mês</p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthDebts.map((debt) => {
                const installmentInfo = getInstallmentInfo(debt);
                const overdue = isOverdue(debt);
                const dueDate = parseISO(debt.due_date);

                return (
                  <div
                    key={debt.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      debt.paid
                        ? 'bg-muted/30 border-border/50 opacity-60'
                        : overdue
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <Checkbox
                      checked={debt.paid}
                      onCheckedChange={() => handleTogglePaid(debt)}
                      className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                    />
                    
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getCategoryColor(debt.category_id) }}
                    />

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${debt.paid ? 'line-through' : ''}`}>
                        {debt.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {debt.type === 'weekly' 
                          ? `Toda ${getDayOfWeekLabel(getDay(dueDate))}`
                          : `Vence dia ${dueDate.getDate()}`
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {debt.type === 'weekly' && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <RefreshCw className="w-3 h-3" />
                          Semanal
                        </Badge>
                      )}
                      {installmentInfo && (
                        <Badge variant="secondary" className="text-xs">
                          {installmentInfo}
                        </Badge>
                      )}
                      {overdue && !debt.paid && (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                      <span className={`font-semibold ${overdue && !debt.paid ? 'text-destructive' : ''}`}>
                        {formatCurrency(Number(debt.amount))}
                      </span>
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
