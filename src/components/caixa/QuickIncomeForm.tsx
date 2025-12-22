import { useState } from 'react';
import { Plus, TrendingUp, Trash2 } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Income } from '@/types/database';

export function QuickIncomeForm() {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const { incomes, categories, addIncome, deleteIncome } = useAppStore();

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const todayIncomes = incomes.filter((i) => isToday(parseISO(i.date)));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const todayTotal = todayIncomes.reduce((acc, i) => acc + Number(i.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim() || !amount || !user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    setIsSubmitting(true);

    const newIncome: Omit<Income, 'id' | 'created_at'> = {
      user_id: user.id,
      source: source.trim(),
      amount: numAmount,
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: categoryId || undefined,
    };

    const { data, error } = await supabase
      .from('incomes')
      .insert(newIncome)
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao adicionar entrada');
    } else {
      addIncome(data as Income);
      setSource('');
      setAmount('');
      setCategoryId('');
      toast.success('Entrada adicionada!');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id);

    if (error) {
      toast.error('Erro ao remover entrada');
    } else {
      deleteIncome(id);
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
            <TrendingUp className="w-5 h-5 text-success" />
            Entradas de Hoje
          </div>
          <span className="text-success font-bold">{formatCurrency(todayTotal)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Fonte"
            value={source}
            onChange={(e) => setSource(e.target.value)}
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
              {incomeCategories.map((cat) => (
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
          {todayIncomes.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma entrada hoje
            </p>
          ) : (
            <div className="space-y-2">
              {todayIncomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 group"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(income.category_id) }}
                  />
                  <span className="flex-1 truncate">{income.source}</span>
                  <span className="font-medium text-success">
                    {formatCurrency(Number(income.amount))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(income.id)}
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
