import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SalesGoal, SalesGoalType } from '@/types/database';
import { format } from 'date-fns';

interface SalesGoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGoal?: SalesGoal | null;
}

const goalTypeOptions: { value: SalesGoalType; label: string }[] = [
  { value: 'faturamento_mensal', label: 'Faturamento Mensal' },
  { value: 'vendas_fechadas', label: 'Vendas Fechadas' },
  { value: 'novos_clientes', label: 'Novos Clientes' },
];

export function SalesGoalForm({ open, onOpenChange, editingGoal }: SalesGoalFormProps) {
  const { user } = useAuthContext();
  const { projects, addSalesGoal, updateSalesGoal } = useAppStore();
  
  const [goalType, setGoalType] = useState<SalesGoalType>('faturamento_mensal');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [projectId, setProjectId] = useState<string>('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setGoalType(editingGoal.goal_type);
      setTargetAmount(editingGoal.target_amount?.toString() || '');
      setCurrentAmount(editingGoal.current_amount?.toString() || '0');
      setStartDate(editingGoal.start_date || format(new Date(), 'yyyy-MM-dd'));
      setEndDate(editingGoal.end_date || '');
      setProjectId(editingGoal.project_id || 'none');
    } else {
      resetForm();
    }
  }, [editingGoal, open]);

  const resetForm = () => {
    setGoalType('faturamento_mensal');
    setTargetAmount('');
    setCurrentAmount('0');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate('');
    setProjectId('none');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !targetAmount || !endDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    const goalData = {
      goal_type: goalType,
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(currentAmount),
      start_date: startDate,
      end_date: endDate,
      project_id: projectId === 'none' ? null : projectId,
    };

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('sales_goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;
        
        updateSalesGoal(editingGoal.id, goalData);
        toast.success('Meta atualizada com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('sales_goals')
          .insert({
            user_id: user.id,
            ...goalData,
          })
          .select()
          .single();

        if (error) throw error;
        
        addSalesGoal(data as SalesGoal);
        toast.success('Meta criada com sucesso!');
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goalType">Tipo de Meta *</Label>
            <Select value={goalType} onValueChange={(v) => setGoalType(v as SalesGoalType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {goalTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectId">Projeto Vinculado</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.project}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Valor Alvo *</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder={goalType === 'novos_clientes' ? 'Ex: 10' : 'Ex: 50000'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentAmount">Valor Atual</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Salvando...' : editingGoal ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
