import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CurrencyInput, parseBRLToNumber } from '@/components/ui/currency-input';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import type { PurchasePlan } from '@/types/database';

interface AddSavingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PurchasePlan;
}

export function AddSavingsModal({ open, onOpenChange, plan }: AddSavingsModalProps) {
  const { updatePurchasePlan } = useAppStore();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const currentSaved = Number(plan.saved_amount);
  const targetAmount = Number(plan.target_amount);
  const remaining = Math.max(0, targetAmount - currentSaved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseBRLToNumber(amount);
    if (amountNum <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setLoading(true);

    const newSavedAmount = currentSaved + amountNum;
    const newStatus = newSavedAmount >= targetAmount ? 'completed' : 'in_progress';

    const { error } = await supabase
      .from('purchase_plans')
      .update({ 
        saved_amount: newSavedAmount,
        status: newStatus,
      })
      .eq('id', plan.id);

    if (error) {
      toast.error('Erro ao adicionar economia');
      setLoading(false);
      return;
    }

    updatePurchasePlan(plan.id, { 
      saved_amount: newSavedAmount,
      status: newStatus,
    });

    if (newSavedAmount >= targetAmount) {
      toast.success('🎉 Meta atingida! Parabéns!');
    } else {
      toast.success(`${formatCurrency(amountNum)} adicionado à economia`);
    }

    setLoading(false);
    setAmount('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Economia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Meta: {plan.name}</p>
            <p className="text-sm font-medium">
              {formatCurrency(currentSaved)} / {formatCurrency(targetAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Faltam {formatCurrency(remaining)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Valor a adicionar</Label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0,00"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={loading || parseBRLToNumber(amount) <= 0}
            >
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
