import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CorporateCost, CorporateCostType, CostFrequency } from '@/types/database';

interface CostFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCost?: CorporateCost | null;
}

const COST_TYPES: { value: CorporateCostType; label: string }[] = [
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'fixo', label: 'Fixo' },
  { value: 'pontual', label: 'Pontual' },
];

const FREQUENCIES: { value: CostFrequency; label: string }[] = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'anual', label: 'Anual' },
  { value: 'diario', label: 'Diário' },
];

export function CostForm({ open, onOpenChange, editingCost }: CostFormProps) {
  const { user } = useAuthContext();
  const { corporateCostCategories, addCorporateCost, updateCorporateCost } = useAppStore();
  
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('none');
  const [amount, setAmount] = useState('');
  const [costType, setCostType] = useState<CorporateCostType>('recorrente');
  const [frequency, setFrequency] = useState<CostFrequency>('mensal');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCost) {
      setName(editingCost.name);
      setCategoryId(editingCost.category_id || 'none');
      setAmount(String(editingCost.amount));
      setCostType(editingCost.cost_type);
      setFrequency(editingCost.frequency || 'mensal');
      setStartDate(editingCost.start_date || '');
      setEndDate(editingCost.end_date || '');
      setIsActive(editingCost.is_active);
      setNotes(editingCost.notes || '');
    } else {
      resetForm();
    }
  }, [editingCost, open]);

  const resetForm = () => {
    setName('');
    setCategoryId('none');
    setAmount('');
    setCostType('recorrente');
    setFrequency('mensal');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!user || !name.trim()) {
      toast.error('Preencha o nome do custo');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    setSaving(true);

    const costData = {
      user_id: user.id,
      name: name.trim(),
      category_id: categoryId === 'none' ? null : categoryId,
      amount: parseFloat(amount),
      cost_type: costType,
      frequency: costType === 'recorrente' ? frequency : null,
      start_date: startDate || null,
      end_date: endDate || null,
      is_active: isActive,
      notes: notes.trim() || null,
    };

    if (editingCost) {
      const { error } = await supabase
        .from('corporate_costs')
        .update(costData)
        .eq('id', editingCost.id);

      if (error) {
        toast.error('Erro ao atualizar custo');
      } else {
        updateCorporateCost(editingCost.id, costData as Partial<CorporateCost>);
        toast.success('Custo atualizado!');
        onOpenChange(false);
      }
    } else {
      const { data, error } = await supabase
        .from('corporate_costs')
        .insert(costData)
        .select()
        .single();

      if (error) {
        toast.error('Erro ao criar custo');
      } else {
        addCorporateCost(data as CorporateCost);
        toast.success('Custo criado!');
        onOpenChange(false);
      }
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingCost ? 'Editar Custo' : 'Novo Custo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Custo *</Label>
            <Input
              placeholder="Ex: Conta de Energia"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {corporateCostCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Custo</Label>
              <Select value={costType} onValueChange={(v) => setCostType(v as CorporateCostType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {costType === 'recorrente' && (
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as CostFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início (opcional)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim (opcional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium">Custo Ativo</p>
              <p className="text-xs text-muted-foreground">Desative para pausar sem excluir</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Notas adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : editingCost ? 'Atualizar' : 'Criar Custo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
