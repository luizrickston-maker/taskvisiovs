import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Income } from '@/types/database';

interface IncomeFormProps {
  /** Income to edit (if provided, form is in edit mode) */
  income?: Income;
  /** Callback when dialog closes */
  onClose?: () => void;
  /** Whether dialog is controlled externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Trigger element (only used when not controlled) */
  trigger?: React.ReactNode;
}

export function IncomeForm({ income, onClose, open: controlledOpen, onOpenChange, trigger }: IncomeFormProps) {
  const isEditMode = !!income;
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setIsOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
    if (!value) {
      onClose?.();
    }
  };

  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>();
  const [categoryId, setCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthContext();
  const { categories, addIncome, updateIncome } = useAppStore();

  const incomeCategories = categories.filter((c) => c.type === 'income');

  // Populate form when editing
  useEffect(() => {
    if (income && isOpen) {
      setSource(income.source);
      setAmount(String(income.amount));
      setDate(parseISO(income.date));
      setCategoryId(income.category_id || '');
    }
  }, [income, isOpen]);

  const resetForm = () => {
    setSource('');
    setAmount('');
    setDate(undefined);
    setCategoryId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      toast.error('Data é obrigatória');
      return;
    }
    if (!user) return;

    const trimmedSource = source.trim();
    if (!trimmedSource) {
      toast.error('Descrição é obrigatória');
      return;
    }
    if (trimmedSource.length > 200) {
      toast.error('Descrição muito longa (máx. 200 caracteres)');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    if (numAmount > 999999999.99) {
      toast.error('Valor muito alto');
      return;
    }

    setIsSubmitting(true);

    const incomeData = {
      source: trimmedSource,
      amount: numAmount,
      date: format(date, 'yyyy-MM-dd'),
      category_id: categoryId || null,
    };

    if (isEditMode && income) {
      // Update existing income
      const { error } = await supabase
        .from('incomes')
        .update(incomeData)
        .eq('id', income.id);

      setIsSubmitting(false);

      if (error) {
        toast.error('Erro ao atualizar ganho');
      } else {
        updateIncome(income.id, incomeData);
        resetForm();
        setIsOpen(false);
        toast.success('Ganho atualizado!');
      }
    } else {
      // Create new income
      const newIncome = {
        ...incomeData,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('incomes')
        .insert(newIncome)
        .select()
        .single();

      setIsSubmitting(false);

      if (error) {
        toast.error('Erro ao adicionar ganho');
      } else {
        addIncome(data as Income);
        resetForm();
        setIsOpen(false);
        toast.success('Ganho adicionado!');
      }
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Novo Ganho
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Ganho' : 'Adicionar Ganho'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source">Descrição / Fonte</Label>
            <Input
              id="source"
              placeholder="Ex: Salário, Freelance, Vendas..."
              value={source}
              onChange={(e) => setSource(e.target.value)}
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
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
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
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isEditMode ? 'Salvar Alterações' : 'Adicionar Ganho'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
