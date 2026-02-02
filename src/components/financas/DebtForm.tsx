import { useState, useEffect } from 'react';
import { format, addDays, getDay, parseISO } from 'date-fns';
import { CalendarIcon, Plus, Pencil } from 'lucide-react';
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

const WEEKDAYS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

/**
 * Gets a reference date for a specific day of the week.
 * Returns today if it matches, otherwise the next occurrence.
 */
function getReferenceDateForWeekday(dayOfWeek: number): Date {
  const today = new Date();
  const todayDay = getDay(today);
  const daysUntil = (dayOfWeek - todayDay + 7) % 7;
  return addDays(today, daysUntil);
}

/**
 * Extracts the weekday from a date string (0 = Sunday, 6 = Saturday)
 */
function getWeekdayFromDate(dateString: string): string {
  const date = parseISO(dateString);
  return String(getDay(date));
}

interface DebtFormProps {
  /** Debt to edit (if provided, form is in edit mode) */
  debt?: Debt;
  /** Callback when dialog closes */
  onClose?: () => void;
  /** Whether dialog is controlled externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Trigger element (only used when not controlled) */
  trigger?: React.ReactNode;
}

export function DebtForm({ debt, onClose, open: controlledOpen, onOpenChange, trigger }: DebtFormProps) {
  const isEditMode = !!debt;
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

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [weekday, setWeekday] = useState<string>('5');
  const [type, setType] = useState<DebtType>('variable');
  const [categoryId, setCategoryId] = useState('');
  const [installmentCurrent, setInstallmentCurrent] = useState('');
  const [installmentTotal, setInstallmentTotal] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthContext();
  const { categories, addDebt, updateDebt } = useAppStore();

  const debtCategories = categories.filter((c) => c.type === 'debt');

  // Populate form when editing
  useEffect(() => {
    if (debt && isOpen) {
      setName(debt.name);
      setAmount(String(debt.amount));
      setType(debt.type as DebtType);
      setCategoryId(debt.category_id || '');
      setNotes(debt.notes || '');
      
      if (debt.type === 'weekly') {
        setWeekday(getWeekdayFromDate(debt.due_date));
      } else {
        setDueDate(parseISO(debt.due_date));
      }
      
      if (debt.type === 'installment') {
        setInstallmentCurrent(String(debt.installment_current || ''));
        setInstallmentTotal(String(debt.installment_total || ''));
      }
    }
  }, [debt, isOpen]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDate(undefined);
    setWeekday('5');
    setType('variable');
    setCategoryId('');
    setInstallmentCurrent('');
    setInstallmentTotal('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isWeekly = type === 'weekly';
    if (!isWeekly && !dueDate) {
      toast.error('Data de vencimento é obrigatória');
      return;
    }
    if (!user) return;
    
    const effectiveDueDate = isWeekly 
      ? getReferenceDateForWeekday(parseInt(weekday))
      : dueDate!;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (trimmedName.length > 200) {
      toast.error('Nome muito longo (máx. 200 caracteres)');
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

    if (notes.length > 500) {
      toast.error('Observações muito longas (máx. 500 caracteres)');
      return;
    }

    if (type === 'installment') {
      const current = parseInt(installmentCurrent);
      const total = parseInt(installmentTotal);
      if (isNaN(current) || isNaN(total) || current < 1 || total < 1 || current > total) {
        toast.error('Parcelas inválidas');
        return;
      }
      if (current > 9999 || total > 9999) {
        toast.error('Número de parcelas muito alto');
        return;
      }
    }

    setIsSubmitting(true);

    const debtData = {
      name: trimmedName,
      amount: numAmount,
      due_date: format(effectiveDueDate, 'yyyy-MM-dd'),
      type,
      category_id: categoryId || null,
      installment_current: type === 'installment' ? parseInt(installmentCurrent) : null,
      installment_total: type === 'installment' ? parseInt(installmentTotal) : null,
      notes: notes.trim() || null,
    };

    if (isEditMode && debt) {
      // Update existing debt
      const { error } = await supabase
        .from('debts')
        .update(debtData)
        .eq('id', debt.id);

      setIsSubmitting(false);

      if (error) {
        toast.error('Erro ao atualizar dívida');
      } else {
        updateDebt(debt.id, debtData);
        resetForm();
        setIsOpen(false);
        toast.success('Dívida atualizada!');
      }
    } else {
      // Create new debt
      const newDebt = {
        ...debtData,
        user_id: user.id,
        paid: false,
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
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Nova Dívida
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
          <DialogTitle>{isEditMode ? 'Editar Dívida' : 'Adicionar Dívida'}</DialogTitle>
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

            {type === 'weekly' ? (
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select value={weekday} onValueChange={setWeekday}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
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
            )}
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
                  <SelectItem value="weekly">Semanal</SelectItem>
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
            {isEditMode ? 'Salvar Alterações' : 'Adicionar Dívida'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
