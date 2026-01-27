import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
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
      setNotes(member.notes || '');
      setIsActive(member.is_active);
    } else {
      setName('');
      setRole('');
      setContractType('pj');
      setCost('');
      setPaymentDay('5');
      setNotes('');
      setIsActive(true);
    }
  }, [member, open]);

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
                {contractType === 'freelancer' ? 'Custo Pontual (R$)' : 'Custo Mensal (R$)'}
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
