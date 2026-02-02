import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CurrencyInput, parseBRLToNumber, numberToBRL } from '@/components/ui/currency-input';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { toast } from 'sonner';
import type { PurchasePlan, PurchasePlanPriority, PurchasePlanStatus } from '@/types/database';

interface PurchasePlanFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editPlan?: PurchasePlan;
}

const categories = [
  'Veículos',
  'Eletrônicos',
  'Casa',
  'Móveis',
  'Eletrodomésticos',
  'Viagens',
  'Educação',
  'Saúde',
  'Lazer',
  'Outro',
];

export function PurchasePlanForm({ open: controlledOpen, onOpenChange, editPlan }: PurchasePlanFormProps) {
  const { addPurchasePlan, updatePurchasePlan } = useAppStore();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  
  const isEditing = !!editPlan;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<PurchasePlanPriority>('medium');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<PurchasePlanStatus>('planning');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editPlan && open) {
      setName(editPlan.name);
      setDescription(editPlan.description || '');
      setTargetAmount(numberToBRL(Number(editPlan.target_amount)));
      setSavedAmount(numberToBRL(Number(editPlan.saved_amount)));
      setDeadline(editPlan.deadline || '');
      setPriority(editPlan.priority);
      setCategory(editPlan.category || '');
      setStatus(editPlan.status);
      setImageUrl(editPlan.image_url || '');
    } else if (!open) {
      resetForm();
    }
  }, [editPlan, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetAmount('');
    setSavedAmount('');
    setDeadline('');
    setPriority('medium');
    setCategory('');
    setStatus('planning');
    setImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseBRLToNumber(targetAmount);
    if (!name.trim() || targetNum <= 0) {
      toast.error('Preencha o nome e o valor alvo');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Usuário não autenticado');
      setLoading(false);
      return;
    }

    const planData = {
      name: name.trim(),
      description: description.trim() || null,
      target_amount: targetNum,
      saved_amount: parseBRLToNumber(savedAmount),
      deadline: deadline || null,
      priority,
      category: category || null,
      status,
      image_url: imageUrl.trim() || null,
    };

    if (isEditing && editPlan) {
      const { data, error } = await supabase
        .from('purchase_plans')
        .update(planData)
        .eq('id', editPlan.id)
        .select()
        .single();

      if (error) {
        toast.error('Erro ao atualizar plano');
        setLoading(false);
        return;
      }

      updatePurchasePlan(editPlan.id, data as PurchasePlan);
      toast.success('Plano atualizado!');
    } else {
      const { data, error } = await supabase
        .from('purchase_plans')
        .insert({ ...planData, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao criar plano');
        setLoading(false);
        return;
      }

      addPurchasePlan(data as PurchasePlan);
      toast.success('Plano criado!');
    }

    setLoading(false);
    setOpen(false);
  };

  const dialogContent = (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar Plano' : 'Novo Plano de Compra'}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Item *</Label>
          <Input
            id="name"
            placeholder="Ex: MacBook Pro, Carro, Viagem..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Detalhes sobre o item desejado..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor Total *</Label>
            <CurrencyInput
              value={targetAmount}
              onChange={setTargetAmount}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-2">
            <Label>Já Economizado</Label>
            <CurrencyInput
              value={savedAmount}
              onChange={setSavedAmount}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as PurchasePlanPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as PurchasePlanStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planejando</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="imageUrl">URL da Imagem (opcional)</Label>
          <Input
            id="imageUrl"
            type="url"
            placeholder="https://exemplo.com/imagem.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Plano'}
        </Button>
      </form>
    </DialogContent>
  );

  // If controlled, render just the content
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // If uncontrolled, include trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
