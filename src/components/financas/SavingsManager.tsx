import { useState } from 'react';
import { PiggyBank, Plus, Minus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Saving } from '@/types/database';

export function SavingsManager() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isPositive, setIsPositive] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { savings, addSaving, deleteSaving } = useAppStore();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalSavings = savings.reduce((acc, s) => acc + Number(s.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description.trim() || !user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    setIsSubmitting(true);

    const finalAmount = isPositive ? numAmount : -numAmount;

    const newSaving: Omit<Saving, 'id' | 'created_at'> = {
      user_id: user.id,
      amount: finalAmount,
      description: description.trim(),
      date: format(new Date(), 'yyyy-MM-dd'),
    };

    const { data, error } = await supabase
      .from('savings')
      .insert(newSaving)
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao adicionar');
    } else {
      addSaving(data as Saving);
      setAmount('');
      setDescription('');
      setIsOpen(false);
      toast.success(isPositive ? 'Depósito realizado!' : 'Saque realizado!');
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('savings').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover');
    } else {
      deleteSaving(id);
    }
  };

  return (
    <Card className="glass-card animate-fade-in w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-primary" />
            Caixa Guardado
          </div>
          <span className={`font-bold ${totalSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalSavings)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPositive(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Depositar
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPositive(false)}
              >
                <Minus className="w-4 h-4 mr-2" />
                Sacar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isPositive ? 'Depositar no Caixa' : 'Sacar do Caixa'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Sobra do mês"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isPositive ? 'Depositar' : 'Sacar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[200px]">
          {savings.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma movimentação
            </p>
          ) : (
            <div className="space-y-2">
              {savings.map((saving) => (
                <div
                  key={saving.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{saving.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(saving.date), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <span
                    className={`font-medium ${
                      Number(saving.amount) >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {Number(saving.amount) >= 0 ? '+' : ''}
                    {formatCurrency(Number(saving.amount))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(saving.id)}
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
