import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Save, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import type { CorporateTeamMember, ContractType } from '@/types/database';

interface TeamMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<CorporateTeamMember>) => void;
  member?: CorporateTeamMember | null;
}

const contractTypes: { value: ContractType; label: string }[] = [
  { value: 'pj', label: 'PJ - Prestador de Serviço' },
  { value: 'clt', label: 'CLT - Salário' },
  { value: 'freelancer', label: 'Freelancer' },
];

export function TeamMemberForm({ open, onOpenChange, onSave, member }: TeamMemberFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [contractType, setContractType] = useState<ContractType>('pj');
  const [cost, setCost] = useState('');
  const [paymentDay, setPaymentDay] = useState('5');
  const [hoursAvailable, setHoursAvailable] = useState('160');
  const [cltBenefits, setCltBenefits] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setContractType(member.contract_type);
      setCost(member.cost.toString());
      setPaymentDay(member.payment_day.toString());
      setHoursAvailable((member.hours_available || 160).toString());
      setCltBenefits((member.clt_benefits || 0).toString());
      setNotes(member.notes || '');
      setIsActive(member.is_active);
    } else {
      setName('');
      setRole('');
      setContractType('pj');
      setCost('');
      setPaymentDay('5');
      setHoursAvailable('160');
      setCltBenefits('');
      setNotes('');
      setIsActive(true);
    }
  }, [member, open]);

  // Calculate real cost for CLT (salary + benefits + ~70% encargos)
  const calculations = useMemo(() => {
    const salary = parseFloat(cost) || 0;
    const benefits = parseFloat(cltBenefits) || 0;
    const hours = parseFloat(hoursAvailable) || 160;
    
    let totalCost = salary;
    let encargos = 0;
    
    if (contractType === 'clt') {
      encargos = salary * 0.7; // ~70% encargos trabalhistas
      totalCost = salary + encargos + benefits;
    }
    
    const costPerHour = hours > 0 ? totalCost / hours : 0;
    
    return {
      encargos,
      totalCost,
      costPerHour,
    };
  }, [cost, cltBenefits, hoursAvailable, contractType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !role.trim()) return;

    setSaving(true);
    
    await onSave({
      name: name.trim(),
      role: role.trim(),
      contract_type: contractType,
      cost: parseFloat(cost) || 0,
      payment_day: parseInt(paymentDay) || 5,
      hours_available: parseInt(hoursAvailable) || 160,
      clt_benefits: parseFloat(cltBenefits) || 0,
      notes: notes.trim() || undefined,
      is_active: isActive,
    });
    
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Input
                id="role"
                placeholder="Ex: Designer, Desenvolvedor"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Contrato</Label>
            <Select value={contractType} onValueChange={(v) => setContractType(v as ContractType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {contractTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">
                {contractType === 'freelancer' ? 'Custo Pontual (R$)' : contractType === 'clt' ? 'Salário Bruto (R$)' : 'Custo Mensal (R$)'}
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="hoursAvailable">Horas Disponíveis/Mês</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Quantidade de horas que o colaborador trabalha por mês. 
                        Usado para calcular o custo por hora da operação.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="hoursAvailable"
                type="number"
                min="1"
                max="744"
                placeholder="160"
                value={hoursAvailable}
                onChange={(e) => setHoursAvailable(e.target.value)}
              />
            </div>
          </div>

          {contractType === 'clt' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="cltBenefits">Benefícios (VA, VT, Plano de Saúde...)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Soma dos benefícios pagos (Vale Alimentação, Vale Transporte, 
                        Plano de Saúde, etc). Encargos (~70%) são calculados automaticamente.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="cltBenefits"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={cltBenefits}
                onChange={(e) => setCltBenefits(e.target.value)}
              />
            </div>
          )}

          {/* Real Cost Preview for CLT */}
          {contractType === 'clt' && parseFloat(cost) > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Salário Bruto:</span>
                <span>{formatCurrency(parseFloat(cost) || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Encargos (~70%):</span>
                <span>{formatCurrency(calculations.encargos)}</span>
              </div>
              {parseFloat(cltBenefits) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Benefícios:</span>
                  <span>{formatCurrency(parseFloat(cltBenefits))}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Custo Real Total:</span>
                <span className="text-primary">{formatCurrency(calculations.totalCost)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Custo por Hora:</span>
                <span>{formatCurrency(calculations.costPerHour)}/h</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDay">Dia do Pagamento</Label>
              <Input
                id="paymentDay"
                type="number"
                min="1"
                max="31"
                placeholder="5"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o colaborador..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Colaborador ativo
            </Label>
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
