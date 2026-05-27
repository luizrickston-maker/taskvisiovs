import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, DollarSign } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { TeamMemberForm } from './TeamMemberForm';
import { TeamMemberCard } from './TeamMemberCard';
import type { CorporateTeamMember } from '@/types/database';

export function TeamManager() {
  const { user } = useAuthContext();
  const { corporateTeam, addCorporateTeamMember, updateCorporateTeamMember, deleteCorporateTeamMember } = useAppStore();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CorporateTeamMember | null>(null);

  const activeMembers = useMemo(() => {
    return corporateTeam.filter(m => m.is_active);
  }, [corporateTeam]);

  const totalMonthlyCost = useMemo(() => {
    return activeMembers
      .filter(m => m.contract_type !== 'freelancer')
      .reduce((sum, m) => sum + m.cost, 0);
  }, [activeMembers]);

  const handleSave = async (data: Partial<CorporateTeamMember> & { email?: string; password?: string }) => {
    if (!user) return;

    if (editingMember) {
      const { error } = await supabase
        .from('corporate_team')
        .update({
          name: data.name,
          role: data.role,
          contract_type: data.contract_type,
          cost: data.cost,
          payment_day: data.payment_day,
          hours_available: data.hours_available,
          clt_benefits: data.clt_benefits,
          notes: data.notes,
          is_active: data.is_active,
        })
        .eq('id', editingMember.id);

      if (error) {
        toast.error('Erro ao atualizar colaborador');
      } else {
        updateCorporateTeamMember(editingMember.id, data);
        toast.success('Colaborador atualizado!');
      }
    } else {
      // Se houver email e senha, criar via Edge Function
      if (data.email && data.password) {
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-collaborator', {
            body: {
              email: data.email,
              password: data.password,
              name: data.name,
              role: data.role,
              workspace_id: undefined, // Let the edge function handle finding the correct workspace_id
              cost: data.cost,
              contract_type: data.contract_type,
              payment_day: data.payment_day,
              hours_available: data.hours_available,
              clt_benefits: data.clt_benefits,
              notes: data.notes
            }
          });

          if (edgeError) throw edgeError;
          
          toast.success('Colaborador criado com acesso ao portal!', {
            description: `Link do portal: ${window.location.origin}/colaborador`,
            action: {
              label: 'Copiar Link',
              onClick: () => {
                navigator.clipboard.writeText(`${window.location.origin}/colaborador`);
                toast.success('Link copiado!');
              }
            }
          });
          // Recarregar dados para pegar o novo membro
          setTimeout(() => window.location.reload(), 2000); 

        } catch (error: any) {
          console.error(error);
          toast.error(`Erro ao criar colaborador: ${error.message}`);
        }
      } else {
        // Criação normal sem login
        const { data: newData, error } = await supabase
          .from('corporate_team')
          .insert({
            user_id: user.id,
            name: data.name || '',
            role: data.role || '',
            contract_type: data.contract_type || 'pj',
            cost: data.cost || 0,
            payment_day: data.payment_day || 5,
            notes: data.notes,
            is_active: data.is_active ?? true,
          })
          .select()
          .single();

        if (error) {
          toast.error('Erro ao adicionar colaborador');
        } else {
          addCorporateTeamMember(newData as CorporateTeamMember);
          toast.success('Colaborador adicionado!');
        }
      }
    }

    setFormOpen(false);
    setEditingMember(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('corporate_team')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover colaborador');
    } else {
      deleteCorporateTeamMember(id);
      toast.success('Colaborador removido');
    }
  };

  const handleEdit = (member: CorporateTeamMember) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleToggleActive = async (member: CorporateTeamMember) => {
    const { error } = await supabase
      .from('corporate_team')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      updateCorporateTeamMember(member.id, { is_active: !member.is_active });
      toast.success(member.is_active ? 'Colaborador desativado' : 'Colaborador ativado');
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo Mensal com Equipe</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(totalMonthlyCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Colaboradores Ativos</p>
                <p className="text-xl font-bold">{activeMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header com botão */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Equipe</CardTitle>
          <Button onClick={() => { setEditingMember(null); setFormOpen(true); }} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Colaborador
          </Button>
        </CardHeader>
        <CardContent>
          {corporateTeam.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum colaborador registrado ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {corporateTeam.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TeamMemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        member={editingMember}
      />
    </div>
  );
}
