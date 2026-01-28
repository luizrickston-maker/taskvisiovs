import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, Save, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import type { CorporateInvestment, InvestmentCategory } from '@/types/database';

interface InvestmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<CorporateInvestment>) => void;
  investment?: CorporateInvestment | null;
}

const categories: { value: InvestmentCategory; label: string }[] = [
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'software', label: 'Software' },
  { value: 'mobilia', label: 'Mobília' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'outro', label: 'Outro' },
];

const usefulLifeSuggestions = [
  { value: '12', label: '12 meses (1 ano)' },
  { value: '24', label: '24 meses (2 anos)' },
  { value: '36', label: '36 meses (3 anos)' },
  { value: '48', label: '48 meses (4 anos)' },
  { value: '60', label: '60 meses (5 anos)' },
];

export function InvestmentForm({ open, onOpenChange, onSave, investment }: InvestmentFormProps) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<InvestmentCategory>('equipamento');
  const [amount, setAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [usefulLifeMonths, setUsefulLifeMonths] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) {
      setItemName(investment.item_name);
      setCategory(investment.category);
      setAmount(investment.amount.toString());
      setPurchaseDate(new Date(investment.purchase_date));
      setUsefulLifeMonths(investment.useful_life_months?.toString() || '');
      setNotes(investment.notes || '');
    } else {
      setItemName('');
      setCategory('equipamento');
      setAmount('');
      setPurchaseDate(new Date());
      setUsefulLifeMonths('');
      setNotes('');
    }
  }, [investment, open]);

  // Calculate depreciation
  const depreciation = useMemo(() => {
    const value = parseFloat(amount) || 0;
    const months = parseInt(usefulLifeMonths) || 0;
    
    if (months > 0 && value > 0) {
      return value / months;
    }
    return 0;
  }, [amount, usefulLifeMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim() || !amount) return;

    setSaving(true);
    
    await onSave({
      item_name: itemName.trim(),
      category,
      amount: parseFloat(amount) || 0,
      purchase_date: format(purchaseDate, 'yyyy-MM-dd'),
      useful_life_months: usefulLifeMonths ? parseInt(usefulLifeMonths) : undefined,
      notes: notes.trim() || undefined,
    });
    
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{investment ? 'Editar Investimento' : 'Novo Investimento'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item</Label>
            <Input
              id="itemName"
              placeholder="Ex: Câmera Sony A7III"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as InvestmentCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data da Compra</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !purchaseDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={(date) => date && setPurchaseDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="usefulLifeMonths">Vida Útil (meses)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Tempo estimado de uso do ativo. A depreciação mensal será 
                      calculada automaticamente e incluída nos custos operacionais.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <Input
                id="usefulLifeMonths"
                type="number"
                min="1"
                placeholder="Ex: 36"
                value={usefulLifeMonths}
                onChange={(e) => setUsefulLifeMonths(e.target.value)}
                className="flex-1"
              />
              <Select value={usefulLifeMonths} onValueChange={setUsefulLifeMonths}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sugestões" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {usefulLifeSuggestions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Depreciation Preview */}
          {depreciation > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor do Investimento:</span>
                <span>{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vida Útil:</span>
                <span>{usefulLifeMonths} meses</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Depreciação Mensal:</span>
                <span className="text-amber-500">{formatCurrency(depreciation)}/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Este valor será incluído automaticamente nos custos operacionais.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
