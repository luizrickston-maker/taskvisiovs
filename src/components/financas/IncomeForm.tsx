import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Plus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CurrencyInput, parseBRLToNumber, numberToBRL } from '@/components/ui/currency-input';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUserIncomeCategories } from '@/hooks/useFinanceCategories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Income, IncomeType } from '@/types/database';

// =====================================================
// Tipos
// =====================================================

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

const INCOME_TYPE_OPTIONS: { value: IncomeType; label: string; description: string }[] = [
  {
    value: 'fixed',
    label: 'Fixo',
    description: 'Valor único e determinado (ex: salário, venda pontual)',
  },
  {
    value: 'recurring',
    label: 'Recorrente',
    description: 'Valor fixo que se repete periodicamente (ex: assinatura, mensalidade)',
  },
  {
    value: 'variable',
    label: 'Variável',
    description: 'Valor que varia dentro de uma faixa (ex: comissões, freelance)',
  },
];

// =====================================================
// Componente
// =====================================================

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

  // Form state
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>();
  const [categoryId, setCategoryId] = useState('');
  const [userCategoryId, setUserCategoryId] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('fixed');
  const [variableMin, setVariableMin] = useState('');
  const [variableMax, setVariableMax] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthContext();
  const { categories, addIncome, updateIncome } = useAppStore();
  const { data: userIncomeCategories = [] } = useUserIncomeCategories();

  // Categorias padrão do sistema
  const systemIncomeCategories = categories.filter((c) => c.type === 'income');

  // Combina categorias do sistema e customizadas
  const allCategories = useMemo(() => {
    const systemCats = systemIncomeCategories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      type: 'system' as const,
    }));
    const userCats = userIncomeCategories.map((c) => ({
      id: c.id,
      name: c.name,
      color: '#10b981', // Cor padrão para categorias customizadas
      type: 'user' as const,
    }));
    return [...systemCats, ...userCats];
  }, [systemIncomeCategories, userIncomeCategories]);

  // Populate form when editing
  useEffect(() => {
    if (income && isOpen) {
      setSource(income.source);
      setAmount(numberToBRL(income.amount));
      setDate(parseISO(income.date));
      setCategoryId(income.category_id || '');
      setUserCategoryId(income.user_category_id || '');
      setIncomeType(income.income_type || 'fixed');
      setVariableMin(income.variable_min_amount ? numberToBRL(income.variable_min_amount) : '');
      setVariableMax(income.variable_max_amount ? numberToBRL(income.variable_max_amount) : '');
    }
  }, [income, isOpen]);

  const resetForm = () => {
    setSource('');
    setAmount('');
    setDate(undefined);
    setCategoryId('');
    setUserCategoryId('');
    setIncomeType('fixed');
    setVariableMin('');
    setVariableMax('');
  };

  // Determina qual categoria está selecionada (sistema ou user)
  const handleCategoryChange = (value: string) => {
    const category = allCategories.find((c) => c.id === value);
    if (category?.type === 'system') {
      setCategoryId(value);
      setUserCategoryId('');
    } else if (category?.type === 'user') {
      setCategoryId('');
      setUserCategoryId(value);
    }
  };

  const selectedCategoryId = categoryId || userCategoryId;

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

    const numAmount = parseBRLToNumber(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    if (numAmount > 999999999.99) {
      toast.error('Valor muito alto');
      return;
    }

    // Validação de valores variáveis
    let variableMinAmount: number | null = null;
    let variableMaxAmount: number | null = null;

    if (incomeType === 'variable') {
      variableMinAmount = parseBRLToNumber(variableMin);
      variableMaxAmount = parseBRLToNumber(variableMax);

      if (variableMin && (isNaN(variableMinAmount) || variableMinAmount < 0)) {
        toast.error('Valor mínimo inválido');
        return;
      }
      if (variableMax && (isNaN(variableMaxAmount) || variableMaxAmount < 0)) {
        toast.error('Valor máximo inválido');
        return;
      }
      if (variableMinAmount && variableMaxAmount && variableMinAmount > variableMaxAmount) {
        toast.error('Valor mínimo não pode ser maior que o máximo');
        return;
      }
    }

    setIsSubmitting(true);

    const incomeData = {
      source: trimmedSource,
      amount: numAmount,
      date: format(date, 'yyyy-MM-dd'),
      category_id: categoryId || null,
      user_category_id: userCategoryId || null,
      income_type: incomeType,
      variable_min_amount: incomeType === 'variable' ? (variableMinAmount || null) : null,
      variable_max_amount: incomeType === 'variable' ? (variableMaxAmount || null) : null,
    };

    if (isEditMode && income) {
      // Update existing income
      const { error } = await supabase
        .from('incomes')
        .update(incomeData)
        .eq('id', income.id);

      setIsSubmitting(false);

      if (error) {
        console.error('Error updating income:', error);
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
        console.error('Error creating income:', error);
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
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-visible">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditMode ? 'Editar Ganho' : 'Adicionar Ganho'}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {/* Descrição / Fonte */}
            <div className="space-y-2">
              <Label htmlFor="source">Descrição / Fonte</Label>
              <Input
                id="source"
                placeholder="Ex: Salário, Freelance, Vendas..."
                value={source}
                onChange={(e) => setSource(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            {/* Tipo de Ganho */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Tipo de Ganho</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium">Fixo:</p>
                      <p className="text-sm">Valor único e determinado</p>
                      <p className="font-medium mt-2">Recorrente:</p>
                      <p className="text-sm">Valor que se repete periodicamente</p>
                      <p className="font-medium mt-2">Variável:</p>
                      <p className="text-sm">Valor que varia dentro de uma faixa</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select value={incomeType} onValueChange={(v) => setIncomeType(v as IncomeType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {incomeType === 'variable' ? 'Valor Esperado' : 'Valor'}
                </Label>
                <CurrencyInput
                  id="amount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="R$ 0,00"
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

            {/* Campos condicionais para Variável */}
            {incomeType === 'variable' && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  Defina a faixa de variação esperada para este ganho:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="variableMin">Valor Mínimo</Label>
                    <CurrencyInput
                      id="variableMin"
                      value={variableMin}
                      onChange={setVariableMin}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variableMax">Valor Máximo</Label>
                    <CurrencyInput
                      id="variableMax"
                      value={variableMax}
                      onChange={setVariableMax}
                      placeholder="R$ 0,00"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhuma categoria disponível
                    </div>
                  ) : (
                    <>
                      {systemIncomeCategories.length > 0 && (
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          Categorias do Sistema
                        </div>
                      )}
                      {systemIncomeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                      {userIncomeCategories.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                            Minhas Categorias
                          </div>
                          {userIncomeCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isEditMode ? 'Salvar Alterações' : 'Adicionar Ganho'}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
