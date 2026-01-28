import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { Building2, User, Package, Calendar, CheckCircle2, FolderKanban, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { Prospect, PaymentType, Project, PaymentMethodEntry } from '@/types/database';

type DurationUnit = 'meses' | 'horas' | 'dias';

const playMoneySound = () => {
  const audio = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_115b9c3b72.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {
    // Silently ignore if autoplay is blocked
  });
};

interface CloseProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onSuccess: () => void;
}

export function CloseProspectModal({ open, onOpenChange, prospect, onSuccess }: CloseProspectModalProps) {
  const { user } = useAuthContext();
  const { servicePlans, updateProspect, addProject, projects } = useAppStore();
  
  const [planId, setPlanId] = useState<string>('');
  const [discount, setDiscount] = useState('0');
  const [paymentType, setPaymentType] = useState<PaymentType>('recorrente');
  const [contractDuration, setContractDuration] = useState('12');
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('meses');
  const [paymentInstallments, setPaymentInstallments] = useState('1');
  const [createProject, setCreateProject] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [projectDeadline, setProjectDeadline] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodEntry[]>([]);

  const activePlans = servicePlans.filter(p => p.is_active);
  
  // Calculate final value from plan price minus discount
  const selectedPlan = activePlans.find(p => p.id === planId);
  const planPrice = selectedPlan?.final_price || 0;
  const discountValue = parseFloat(discount) || 0;
  const finalValue = Math.max(0, planPrice - discountValue);
  
  // Calculate total fees from payment methods
  const totalFees = useMemo(() => 
    paymentMethods.reduce((sum, m) => sum + (m.fee || 0), 0),
    [paymentMethods]
  );
  
  // Check if prospect already has a linked project
  const hasExistingProject = prospect?.project_id && projects.some(p => p.id === prospect.project_id);

  useEffect(() => {
    if (open && prospect) {
      // Reset form when opening
      setPlanId(prospect.plan_id || '');
      setDiscount('0');
      setPaymentType(prospect.payment_type as PaymentType || 'recorrente');
      setContractDuration(prospect.contract_duration?.toString() || '12');
      setDurationUnit('meses');
      setPaymentInstallments(prospect.payment_installments?.toString() || '1');
      setCreateProject(!hasExistingProject);
      setPaymentMethods([]);
      
      // Generate suggested project name
      const suggestedName = prospect.project_type 
        ? `${prospect.project_type} - ${prospect.company_name || prospect.client_name}`
        : `${prospect.client_name}${prospect.company_name ? ` - ${prospect.company_name}` : ''}`;
      setProjectName(suggestedName);
      setProjectDeadline(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
      
      // If prospect already has a plan, auto-fill payment type from it
      if (prospect.plan_id) {
        const existingPlan = activePlans.find(p => p.id === prospect.plan_id);
        if (existingPlan) {
          setPaymentType(existingPlan.plan_type as PaymentType);
        }
      }
    }
  }, [open, prospect, activePlans, hasExistingProject]);

  const handlePlanChange = (value: string) => {
    setPlanId(value);
    setDiscount('0'); // Reset discount when plan changes
    setPaymentMethods([]); // Reset payment methods
    const plan = activePlans.find(p => p.id === value);
    if (plan) {
      setPaymentType(plan.plan_type as PaymentType);
    }
  };

  const handleConfirm = async () => {
    if (!prospect || !user?.id) return;
    
    // Validation
    if (!planId) {
      toast.error('Selecione um plano vendido');
      return;
    }
    
    if (finalValue <= 0) {
      toast.error('O desconto não pode ser maior que o valor do plano');
      return;
    }

    if (createProject && !projectName.trim()) {
      toast.error('Informe o nome do projeto');
      return;
    }

    setIsSubmitting(true);

    try {
      let newProjectId: string | null = null;

      // 1. Create project if requested
      if (createProject && !hasExistingProject) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            project: projectName.trim(),
            task: projectName.trim(),
            client_name: prospect.client_name,
            company_name: prospect.company_name || null,
            deadline: projectDeadline,
            priority: 2, // High priority for closed sales
            status: 'progress',
            is_corporate: true,
            prospect_id: prospect.id,
          })
          .select()
          .single();

        if (projectError) throw projectError;
        
        newProjectId = projectData.id;
        addProject(projectData as Project);
      }

      // 2. Update prospect to "fechado"
      // Store duration unit in notes if not months
      const durationNote = durationUnit !== 'meses' 
        ? `Duração: ${contractDuration} ${durationUnit}`
        : null;
      const updatedNotes = durationNote 
        ? (prospect.notes ? `${prospect.notes}\n${durationNote}` : durationNote)
        : prospect.notes;

      const prospectUpdate: Partial<Prospect> = {
        status: 'fechado',
        plan_id: planId,
        estimated_value: finalValue,
        payment_type: paymentType,
        contract_duration: paymentType === 'recorrente' ? parseInt(contractDuration) || null : null,
        payment_installments: paymentType === 'pontual' ? parseInt(paymentInstallments) || null : null,
        notes: updatedNotes,
        payment_methods: paymentMethods.length > 0 ? paymentMethods : null,
        total_fees: totalFees,
      };

      // Link to new project if created
      if (newProjectId) {
        prospectUpdate.project_id = newProjectId;
      }

      const { error: updateError } = await supabase
        .from('prospects')
        .update(prospectUpdate)
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      updateProspect(prospect.id, prospectUpdate);
      
      // Play money sound on success
      playMoneySound();
      
      toast.success(
        createProject && newProjectId 
          ? 'Venda fechada e projeto criado!' 
          : 'Venda fechada com sucesso!'
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error closing prospect:', error);
      toast.error('Erro ao fechar venda');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Confirmar Fechamento de Venda
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes da venda antes de fechar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-4">
            {/* Client Info Summary */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{prospect.client_name}</span>
              </div>
              {prospect.company_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{prospect.company_name}</span>
                </div>
              )}
            </div>

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label htmlFor="plan" className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                Plano Vendido *
              </Label>
              <Select value={planId} onValueChange={handlePlanChange}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {activePlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{plan.name} ({plan.tier})</span>
                        <span className="text-muted-foreground text-xs">
                          {formatCurrency(plan.final_price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Discount (optional) */}
            <div className="space-y-2">
              <Label htmlFor="discount" className="flex items-center gap-1">
                <Percent className="w-4 h-4" />
                Desconto (opcional)
              </Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                max={planPrice}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Final Value Display */}
            {planId && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor Final:</span>
                  <span className="text-lg font-bold text-success">
                    {formatCurrency(finalValue)}
                  </span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">
                      Original: {formatCurrency(planPrice)}
                    </span>
                    <span className="text-xs text-destructive">
                      -{formatCurrency(discountValue)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods */}
            {finalValue > 0 && (
              <PaymentMethodSelector
                totalValue={finalValue}
                selectedMethods={paymentMethods}
                onChange={setPaymentMethods}
              />
            )}

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="pontual">Pontual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration with unit selector for recurrent */}
            {paymentType === 'recorrente' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={contractDuration}
                    onChange={(e) => setContractDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={durationUnit} onValueChange={(v) => setDurationUnit(v as DurationUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[200]">
                      <SelectItem value="meses">Meses</SelectItem>
                      <SelectItem value="horas">Horas</SelectItem>
                      <SelectItem value="dias">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  value={paymentInstallments}
                  onChange={(e) => setPaymentInstallments(e.target.value)}
                />
              </div>
            )}

            {/* Create Project Checkbox */}
            {!hasExistingProject && (
              <>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="createProject"
                    checked={createProject}
                    onCheckedChange={(checked) => setCreateProject(checked as boolean)}
                  />
                  <Label 
                    htmlFor="createProject" 
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <FolderKanban className="w-4 h-4" />
                    Criar projeto automaticamente
                  </Label>
                </div>

                {/* Project Fields (conditional) */}
                {createProject && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Nome do Projeto</Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Nome do projeto"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectDeadline" className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Prazo Inicial
                      </Label>
                      <Input
                        id="projectDeadline"
                        type="date"
                        value={projectDeadline}
                        onChange={(e) => setProjectDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {hasExistingProject && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <FolderKanban className="w-4 h-4 inline mr-2" />
                Esta prospecção já possui um projeto vinculado
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-2 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm} 
            disabled={isSubmitting || !planId} 
            className="flex-1"
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar Venda'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
