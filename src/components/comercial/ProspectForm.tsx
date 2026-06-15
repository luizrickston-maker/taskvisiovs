import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Prospect, ProspectStatus, PaymentType } from '@/types/database';
import { format } from 'date-fns';

interface ProspectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProspect?: Prospect | null;
}

const statusOptions: { value: ProspectStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_negociacao', label: 'Em Negociação' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

const paymentTypeOptions: { value: PaymentType; label: string }[] = [
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'pontual', label: 'Pontual' },
];

export function ProspectForm({ open, onOpenChange, editingProspect }: ProspectFormProps) {
  const { user } = useAuthContext();
  const { projects = [], servicePlans = [], addProspect, updateProspect } = useAppStore();
  
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [prospectionDate, setProspectionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<ProspectStatus>('novo');
  const [projectId, setProjectId] = useState<string>('none');
  const [planId, setPlanId] = useState<string>('none');
  const [projectType, setProjectType] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType | 'none'>('none');
  const [contractDuration, setContractDuration] = useState('');
  const [paymentInstallments, setPaymentInstallments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get active plans
  const activePlans = servicePlans.filter(p => p.is_active);

  useEffect(() => {
    if (editingProspect) {
      setClientName(editingProspect.client_name);
      setCompanyName(editingProspect.company_name || '');
      setProspectionDate(editingProspect.prospection_date);
      setStatus(editingProspect.status);
      setProjectId(editingProspect.project_id || 'none');
      setPlanId(editingProspect.plan_id || 'none');
      setProjectType(editingProspect.project_type || '');
      setEstimatedValue(editingProspect.estimated_value?.toString() || '');
      setNotes(editingProspect.notes || '');
      setPaymentType(editingProspect.payment_type || 'none');
      setContractDuration(editingProspect.contract_duration?.toString() || '');
      setPaymentInstallments(editingProspect.payment_installments?.toString() || '');
    } else {
      resetForm();
    }
  }, [editingProspect, open]);

  const resetForm = () => {
    setClientName('');
    setCompanyName('');
    setProspectionDate(format(new Date(), 'yyyy-MM-dd'));
    setStatus('novo');
    setProjectId('none');
    setPlanId('none');
    setProjectType('');
    setEstimatedValue('');
    setNotes('');
    setPaymentType('none');
    setContractDuration('');
    setPaymentInstallments('');
  };
  
  // Auto-fill value when plan is selected
  const handlePlanChange = (value: string) => {
    setPlanId(value);
    if (value !== 'none') {
      const selectedPlan = activePlans.find(p => p.id === value);
      if (selectedPlan && selectedPlan.final_price > 0) {
        setEstimatedValue(selectedPlan.final_price.toString());
        // If plan is recurrent, set payment type
        if (selectedPlan.plan_type === 'recorrente') {
          setPaymentType('recorrente');
        } else {
          setPaymentType('pontual');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate client name
    const trimmedClientName = clientName.trim();
    if (!user?.id || !trimmedClientName) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }
    if (trimmedClientName.length > 200) {
      toast.error('Nome do cliente muito longo (máx. 200 caracteres)');
      return;
    }

    // Validate company name
    if (companyName.length > 200) {
      toast.error('Nome da empresa muito longo (máx. 200 caracteres)');
      return;
    }

    // Validate project type
    if (projectType.length > 100) {
      toast.error('Tipo de projeto muito longo (máx. 100 caracteres)');
      return;
    }

    // Validate estimated value
    const parsedValue = parseFloat(estimatedValue) || 0;
    if (parsedValue > 999999999.99) {
      toast.error('Valor estimado muito alto');
      return;
    }

    // Validate notes
    if (notes.length > 1000) {
      toast.error('Notas muito longas (máx. 1000 caracteres)');
      return;
    }

    // Validate contract duration
    if (paymentType === 'recorrente' && contractDuration) {
      const duration = parseInt(contractDuration);
      if (duration > 9999) {
        toast.error('Duração do contrato muito longa');
        return;
      }
    }

    // Validate installments
    if (paymentType === 'pontual' && paymentInstallments) {
      const installments = parseInt(paymentInstallments);
      if (installments > 9999) {
        toast.error('Número de parcelas muito alto');
        return;
      }
    }

    setIsSubmitting(true);

    const prospectData = {
      client_name: trimmedClientName,
      company_name: companyName.trim() || null,
      prospection_date: prospectionDate,
      status,
      project_id: projectId === 'none' ? null : projectId,
      plan_id: planId === 'none' ? null : planId,
      project_type: projectType.trim() || null,
      estimated_value: parsedValue,
      notes: notes.trim() || null,
      payment_type: paymentType === 'none' ? null : paymentType,
      contract_duration: paymentType === 'recorrente' && contractDuration ? parseInt(contractDuration) : null,
      payment_installments: paymentType === 'pontual' && paymentInstallments ? parseInt(paymentInstallments) : null,
    };

    try {
      if (editingProspect) {
        const { error } = await supabase
          .from('prospects')
          .update(prospectData)
          .eq('id', editingProspect.id);

        if (error) throw error;

        updateProspect(editingProspect.id, prospectData);
        toast.success('Prospecção atualizada!');
      } else {
        const { data: workspaceId, error: wsError } = await supabase.rpc('get_my_workspace_id');
        if (wsError || !workspaceId) {
          toast.error('Não foi possível identificar seu workspace. Recarregue a página.');
          setIsSubmitting(false);
          return;
        }

        const { data, error } = await supabase
          .from('prospects')
          .insert({
            user_id: user.id,
            workspace_id: workspaceId,
            ...prospectData,
          })
          .select()
          .single();

        if (error) throw error;

        addProspect(data as Prospect);
        toast.success('Prospecção adicionada!');
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving prospect:', error);
      toast.error('Erro ao salvar prospecção');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProspect ? 'Editar Prospecção' : 'Nova Prospecção'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospectionDate">Data da Prospecção *</Label>
              <Input
                id="prospectionDate"
                type="date"
                value={prospectionDate}
                onChange={(e) => setProspectionDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProspectStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="planId">Plano Vendido</Label>
              <Select value={planId} onValueChange={handlePlanChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {activePlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Projeto Vinculado</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.project}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectType">Tipo de Projeto</Label>
            <Input
              id="projectType"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              placeholder="Ex: Automação com IA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Valor Estimado (R$)</Label>
              <Input
                id="estimatedValue"
                type="number"
                step="0.01"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Tipo de Pagamento</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType | 'none')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {paymentTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {paymentType === 'recorrente' && (
            <div className="space-y-2">
              <Label htmlFor="contractDuration">Duração do Contrato (meses)</Label>
              <Input
                id="contractDuration"
                type="number"
                min="1"
                value={contractDuration}
                onChange={(e) => setContractDuration(e.target.value)}
                placeholder="Ex: 12"
              />
            </div>
          )}

          {paymentType === 'pontual' && (
            <div className="space-y-2">
              <Label htmlFor="paymentInstallments">Parcelas de Pagamento</Label>
              <Input
                id="paymentInstallments"
                type="number"
                min="1"
                value={paymentInstallments}
                onChange={(e) => setPaymentInstallments(e.target.value)}
                placeholder="Ex: 3"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre esta prospecção..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Salvando...' : editingProspect ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
