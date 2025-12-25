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
import type { Prospect, ProspectStatus } from '@/types/database';
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

export function ProspectForm({ open, onOpenChange, editingProspect }: ProspectFormProps) {
  const { user } = useAuthContext();
  const { projects, addProspect, updateProspect } = useAppStore();
  
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [prospectionDate, setProspectionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<ProspectStatus>('novo');
  const [projectId, setProjectId] = useState<string>('none');
  const [projectType, setProjectType] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingProspect) {
      setClientName(editingProspect.client_name);
      setCompanyName(editingProspect.company_name || '');
      setProspectionDate(editingProspect.prospection_date);
      setStatus(editingProspect.status);
      setProjectId(editingProspect.project_id || 'none');
      setProjectType(editingProspect.project_type || '');
      setEstimatedValue(editingProspect.estimated_value?.toString() || '');
      setNotes(editingProspect.notes || '');
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
    setProjectType('');
    setEstimatedValue('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !clientName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setIsSubmitting(true);

    const prospectData = {
      client_name: clientName.trim(),
      company_name: companyName.trim() || null,
      prospection_date: prospectionDate,
      status,
      project_id: projectId === 'none' ? null : projectId,
      project_type: projectType.trim() || null,
      estimated_value: parseFloat(estimatedValue) || 0,
      notes: notes.trim() || null,
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
        const { data, error } = await supabase
          .from('prospects')
          .insert({
            user_id: user.id,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProspect ? 'Editar Prospecção' : 'Nova Prospecção'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="projectType">Tipo de Projeto</Label>
              <Input
                id="projectType"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="Ex: Automação com IA"
              />
            </div>
          </div>

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
