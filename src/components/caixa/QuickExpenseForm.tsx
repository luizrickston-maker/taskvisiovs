import { useState } from 'react';
import { Plus, TrendingDown, Trash2 } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Expense } from '@/types/database';

export function QuickExpenseForm() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuthContext();
  const { expenses, categories, addExpense, deleteExpense } = useAppStore();

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const todayExpenses = expenses.filter((e) => isToday(parseISO(e.date)));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const todayTotal = todayExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    setIsSubmitting(true);

    const newExpense: Omit<Expense, 'id' | 'created_at'> = {
      user_id: user.id,
      description: description.trim(),
      amount: numAmount,
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: categoryId || undefined,
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao adicionar custo');
    } else {
      addExpense(data as Expense);
      setDescription('');
      setAmount('');
      setCategoryId('');
      toast.success('Custo adicionado!');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao remover custo');
    } else {
      deleteExpense(id);
    }
  };

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            Custos de Hoje
          </div>
          <span className="text-destructive font-bold">{formatCurrency(todayTotal)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24"
          />
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="icon" disabled={isSubmitting}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>

        <ScrollArea className="h-[180px]">
          {todayExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum custo hoje
            </p>
          ) : (
            <div className="space-y-2">
              {todayExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 group"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(expense.category_id) }}
                  />
                  <span className="flex-1 truncate">{expense.description}</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(Number(expense.amount))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
