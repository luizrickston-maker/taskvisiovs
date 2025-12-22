import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Debt, DebtType } from '@/types/database';

export function DebtForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [type, setType] = useState<DebtType>('variable');
  const [categoryId, setCategoryId] = useState('');
  const [installmentCurrent, setInstallmentCurrent] = useState('');
  const [installmentTotal, setInstallmentTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthContext();
  const { categories, addDebt } = useAppStore();

  const debtCategories = categories.filter((c) => c.type === 'debt');

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDate(undefined);
    setType('variable');
    setCategoryId('');
    setInstallmentCurrent('');
    setInstallmentTotal('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || !dueDate || !user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (type === 'installment') {
      const current = parseInt(installmentCurrent);
      const total = parseInt(installmentTotal);
      if (isNaN(current) || isNaN(total) || current < 1 || total < 1 || current > total) {
        toast.error('Parcelas inválidas');
        return;
      }
    }

    setIsSubmitting(true);

    const newDebt: Omit<Debt, 'id' | 'created_at' | 'updated_at'> = {
      user_id: user.id,
      name: name.trim(),
      amount: numAmount,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      paid: false,
      type,
      category_id: categoryId || undefined,
      installment_current: type === 'installment' ? parseInt(installmentCurrent) : undefined,
      installment_total: type === 'installment' ? parseInt(installmentTotal) : undefined,
      notes: notes.trim() || undefined,
    };

    const { data, error } = await supabase
      .from('debts')
      .insert(newDebt)
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao adicionar dívida');
    } else {
      addDebt(data as Debt);
      resetForm();
      setIsOpen(false);
      toast.success('Dívida adicionada!');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Dívida
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Dívida</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Netflix"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as DebtType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variable">Variável</SelectItem>
                  <SelectItem value="fixed">Fixa (mensal)</SelectItem>
                  <SelectItem value="installment">Parcelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {debtCategories.map((cat) => (
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
            </div>
          </div>

          {type === 'installment' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installmentCurrent">Parcela Atual</Label>
                <Input
                  id="installmentCurrent"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={installmentCurrent}
                  onChange={(e) => setInstallmentCurrent(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installmentTotal">Total de Parcelas</Label>
                <Input
                  id="installmentTotal"
                  type="number"
                  min="1"
                  placeholder="12"
                  value={installmentTotal}
                  onChange={(e) => setInstallmentTotal(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Adicionar Dívida
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
