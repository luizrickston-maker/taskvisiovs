import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, parseCurrency } from '@/lib/currency';
import { PlanItemSelector } from './PlanItemSelector';
import type { ServicePlan, ServicePlanItem, PlanTier, PlanType } from '@/types/database';
import { cn } from '@/lib/utils';

interface PlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlan: ServicePlan | null;
}

interface SelectedItem {
  pricing_id: string;
  quantity: number;
  custom_price: number | null;
}

export function PlanForm({ open, onOpenChange, editingPlan }: PlanFormProps) {
  const { user } = useAuthContext();
  const { 
    corporatePricings, 
    servicePlanItems,
    addServicePlan, 
    updateServicePlan,
    setServicePlanItems,
  } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<PlanTier>('bronze');
  const [planType, setPlanType] = useState<PlanType>('recorrente');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [finalPriceInput, setFinalPriceInput] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Load existing plan data
  useEffect(() => {
    if (editingPlan) {
      setName(editingPlan.name);
      setDescription(editingPlan.description || '');
      setTier(editingPlan.tier);
      setPlanType(editingPlan.plan_type);
      setMonthlyLimit(editingPlan.monthly_limit || '');
      setIsActive(editingPlan.is_active);
      setNotes(editingPlan.notes || '');
      setFinalPriceInput(formatCurrency(editingPlan.final_price));

      // Load existing items
      const existingItems = servicePlanItems
        .filter(item => item.plan_id === editingPlan.id)
        .map(item => ({
          pricing_id: item.pricing_id,
          quantity: item.quantity,
          custom_price: item.custom_price ?? null,
        }));
      setSelectedItems(existingItems);
    } else {
      resetForm();
    }
  }, [editingPlan, servicePlanItems, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTier('bronze');
    setPlanType('recorrente');
    setMonthlyLimit('');
    setIsActive(true);
    setNotes('');
    setFinalPriceInput('');
    setSelectedItems([]);
  };

  // Calculations
  const baseCost = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const pricing = corporatePricings.find(p => p.id === item.pricing_id);
      if (!pricing) return sum;
      const price = item.custom_price ?? pricing.final_price;
      return sum + (price * item.quantity);
    }, 0);
  }, [selectedItems, corporatePricings]);

  const finalPrice = parseCurrency(finalPriceInput) || 0;
  const profit = finalPrice - baseCost;
  const profitMargin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;

  // Auto-set final price to base cost when no custom price is set
  useEffect(() => {
    if (!editingPlan && baseCost > 0 && !finalPriceInput) {
      setFinalPriceInput(formatCurrency(baseCost));
    }
  }, [baseCost, editingPlan, finalPriceInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsSubmitting(true);

    const planData = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      tier,
      plan_type: planType,
      base_cost: baseCost,
      final_price: finalPrice,
      profit,
      profit_margin: profitMargin,
      monthly_limit: monthlyLimit.trim() || null,
      is_active: isActive,
      notes: notes.trim() || null,
    };

    try {
      if (editingPlan) {
        // Update plan
        const { error } = await supabase
          .from('service_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        updateServicePlan(editingPlan.id, planData);

        // Delete existing items and re-insert
        await supabase
          .from('service_plan_items')
          .delete()
          .eq('plan_id', editingPlan.id);

        // Insert new items
        if (selectedItems.length > 0) {
          const itemsToInsert = selectedItems.map(item => ({
            user_id: user.id,
            plan_id: editingPlan.id,
            pricing_id: item.pricing_id,
            quantity: item.quantity,
            custom_price: item.custom_price,
          }));

          const { data: newItems } = await supabase
            .from('service_plan_items')
            .insert(itemsToInsert)
            .select();

          if (newItems) {
            // Update store - remove old items and add new ones
            const updatedItems = servicePlanItems
              .filter(i => i.plan_id !== editingPlan.id)
              .concat(newItems as ServicePlanItem[]);
            setServicePlanItems(updatedItems);
          }
        } else {
          // Just remove items from store
          setServicePlanItems(servicePlanItems.filter(i => i.plan_id !== editingPlan.id));
        }

        toast({ title: 'Plano atualizado', description: 'O plano foi salvo com sucesso.' });
      } else {
        // Create new plan
        const { data: newPlan, error } = await supabase
          .from('service_plans')
          .insert(planData)
          .select()
          .single();

        if (error) throw error;

        addServicePlan(newPlan as ServicePlan);

        // Insert items
        if (selectedItems.length > 0) {
          const itemsToInsert = selectedItems.map(item => ({
            user_id: user.id,
            plan_id: newPlan.id,
            pricing_id: item.pricing_id,
            quantity: item.quantity,
            custom_price: item.custom_price,
          }));

          const { data: newItems } = await supabase
            .from('service_plan_items')
            .insert(itemsToInsert)
            .select();

          if (newItems) {
            setServicePlanItems([...servicePlanItems, ...(newItems as ServicePlanItem[])]);
          }
        }

        toast({ title: 'Plano criado', description: 'O plano foi criado com sucesso.' });
      }

      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar plano',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {editingPlan ? 'Editar Plano' : 'Novo Plano de Serviço'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Informações Básicas</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Plano *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Pacote Marketing Básico"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva o que está incluso neste plano..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nível</Label>
                      <Select value={tier} onValueChange={(v) => setTier(v as PlanTier)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">🥉 Bronze</SelectItem>
                          <SelectItem value="silver">🥈 Prata</SelectItem>
                          <SelectItem value="gold">🥇 Ouro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recorrente">Recorrente</SelectItem>
                          <SelectItem value="pontual">Pontual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyLimit">Limite Mensal (opcional)</Label>
                    <Input
                      id="monthlyLimit"
                      value={monthlyLimit}
                      onChange={(e) => setMonthlyLimit(e.target.value)}
                      placeholder="Ex: 10 horas/mês, 5 entregas"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Status Ativo</Label>
                      <p className="text-xs text-muted-foreground">Disponível para venda</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Service Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Serviços do Plano</h3>
                <PlanItemSelector
                  pricings={corporatePricings}
                  selectedItems={selectedItems}
                  onChange={setSelectedItems}
                />
              </div>

              <Separator />

              {/* Price Summary */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Resumo de Preços</h3>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Custo Base (soma dos itens)</span>
                    <span className="font-medium">{formatCurrency(baseCost)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="finalPrice" className="text-sm text-muted-foreground whitespace-nowrap">
                      Preço Final
                    </Label>
                    <Input
                      id="finalPrice"
                      value={finalPriceInput}
                      onChange={(e) => setFinalPriceInput(e.target.value)}
                      placeholder="R$ 0,00"
                      className="max-w-[150px] text-right font-medium"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Lucro</span>
                    <span className={cn('font-medium', profit >= 0 ? 'text-green-600' : 'text-destructive')}>
                      {formatCurrency(profit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Margem de Lucro</span>
                    <span className={cn('font-bold text-lg', profitMargin >= 0 ? 'text-green-600' : 'text-destructive')}>
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas sobre este plano..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 p-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Salvando...' : editingPlan ? 'Salvar' : 'Criar Plano'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
