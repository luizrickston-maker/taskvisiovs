import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Users, DollarSign } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';
import { TeamMemberForm } from './TeamMemberForm';
import { TeamMemberCard } from './TeamMemberCard';
import { TeamMemberProgressDetails } from './team/TeamMemberProgressDetails';
import type { CorporateTeamMember } from '@/types/database';

export function TeamManager() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { corporateTeam, addCorporateTeamMember, updateCorporateTeamMember, deleteCorporateTeamMember } = useAppStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CorporateTeamMember | null>(null);
  const [selectedMemberProgress, setSelectedMemberProgress] = useState<CorporateTeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<CorporateTeamMember | null>(null);

  const activeMembers = useMemo(
    () => corporateTeam.filter(m => m.is_active),
    [corporateTeam],
  );

  const totalMonthlyCost = useMemo(
    () => activeMembers
      .filter(m => m.contract_type !== 'freelancer')
      .reduce((sum, m) => sum + m.cost, 0),
    [activeMembers],
  );

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
          whatsapp: data.whatsapp ?? null,
        })
        .eq('id', editingMember.id);

      if (error) {
        toast.error('Erro ao atualizar colaborador');
      } else {
        updateCorporateTeamMember(editingMember.id, data);
        toast.success('Colaborador atualizado!');
      }
    } else {
      if (data.email && data.password) {
        try {
          const { error: edgeError } = await supabase.functions.invoke('create-collaborator', {
            body: {
              email: data.email,
              password: data.password,
              name: data.name,
              role: data.role,
              cost: data.cost,
              contract_type: data.contract_type,
              payment_day: data.payment_day,
              hours_available: data.hours_available,
              clt_benefits: data.clt_benefits,
              notes: data.notes,
              whatsapp: data.whatsapp,
            },
          });

          if (edgeError) throw edgeError;

          const portalLink = `${window.location.origin}/colaborador`;

          toast.success('Colaborador criado com acesso ao portal!', {
            description: `Link: ${portalLink}`,
            action: {
              label: 'Copiar Link',
              onClick: () => {
                navigator.clipboard.writeText(portalLink);
                toast.success('Link copiado!');
              },
            },
          });

          // Invalida o cache React Query para recarregar a equipe sem reload
          await queryClient.invalidateQueries({ queryKey: ['corporate-team'] });

        } catch (error: any) {
          const errorMsg = error.context?.error || error.message || 'Erro desconhecido';
          toast.error(`Erro ao criar colaborador: ${errorMsg}`);
        }
      } else {
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
            whatsapp: data.whatsapp ?? null,
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

  const confirmDelete = async () => {
    if (!deletingMember) return;
    const { error } = await supabase
      .from('corporate_team')
      .delete()
      .eq('id', deletingMember.id);

    if (error) {
      toast.error('Erro ao remover colaborador');
    } else {
      deleteCorporateTeamMember(deletingMember.id);
      toast.success('Colaborador removido');
    }
    setDeletingMember(null);
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

  if (selectedMemberProgress) {
    return (
      <TeamMemberProgressDetails
        member={selectedMemberProgress}
        onBack={() => setSelectedMemberProgress(null)}
      />
    );
  }

  return (
    <>
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
                  <p className="text-xl font-bold text-primary">{formatCurrency(totalMonthlyCost)}</p>
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

        {/* Lista da equipe */}
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
                    onDelete={(id) => {
                      const m = corporateTeam.find(m => m.id === id);
                      if (m) setDeletingMember(m);
                    }}
                    onToggleActive={handleToggleActive}
                    onViewProgress={(m) => setSelectedMemberProgress(m)}
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

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deletingMember} onOpenChange={(open) => { if (!open) setDeletingMember(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O colaborador <strong>{deletingMember?.name}</strong> será
              removido da equipe permanentemente. O acesso ao portal será revogado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}