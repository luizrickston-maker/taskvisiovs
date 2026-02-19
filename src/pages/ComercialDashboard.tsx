import { useState } from 'react';
import { Briefcase, Users } from 'lucide-react';
import { SectionBoundary } from '@/components/SectionBoundary';
import { SalesGoalsSummary } from '@/components/comercial/SalesGoalsSummary';
import { SalesGoalForm } from '@/components/comercial/SalesGoalForm';
import { ProspectList } from '@/components/comercial/ProspectList';
import { ProspectForm } from '@/components/comercial/ProspectForm';
import { ProspectDetailModal } from '@/components/comercial/ProspectDetailModal';
import { CloseProspectModal } from '@/components/comercial/CloseProspectModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Prospect } from '@/types/database';

export default function ComercialDashboard() {
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [detailProspect, setDetailProspect] = useState<Prospect | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [closeProspect, setCloseProspect] = useState<Prospect | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: clients = [] } = useQuery({
    queryKey: ['comercial-clients-count'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, is_active, company_name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setProspectFormOpen(true);
  };

  const handleViewProspect = (prospect: Prospect) => {
    setDetailProspect(prospect);
    setDetailModalOpen(true);
  };

  const handleCloseProspectForm = (open: boolean) => {
    setProspectFormOpen(open);
    if (!open) setEditingProspect(null);
  };

  const handleEditFromDetail = () => {
    if (detailProspect) {
      setEditingProspect(detailProspect);
      setProspectFormOpen(true);
    }
  };

  const handleCloseProspect = (prospect: Prospect) => {
    setCloseProspect(prospect);
    setCloseModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gestão Comercial</h1>
          <p className="text-sm text-muted-foreground">Metas, pipeline e clientes</p>
        </div>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="mb-4">
          <TabsTrigger value="pipeline" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="w-4 h-4" />
            Clientes
            {clients.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-4">{clients.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Resumo de Metas</h2>
            <SectionBoundary name="SalesGoalsSummary">
              <SalesGoalsSummary onAddGoal={() => setGoalFormOpen(true)} />
            </SectionBoundary>
          </section>
          <section>
            <SectionBoundary name="ProspectList">
              <ProspectList
                onAddProspect={() => setProspectFormOpen(true)}
                onEditProspect={handleEditProspect}
                onViewProspect={handleViewProspect}
                onCloseProspect={handleCloseProspect}
              />
            </SectionBoundary>
          </section>
        </TabsContent>

        <TabsContent value="clientes">
          <div className="space-y-3">
            {clients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum cliente cadastrado</p>
              </div>
            ) : (
              clients.map(client => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                  onClick={() => navigate(`/pj/clientes/${client.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{client.name}</p>
                      {client.company_name && (
                        <p className="text-xs text-muted-foreground">{client.company_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={client.is_active ? 'default' : 'secondary'} className="text-xs">
                      {client.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); navigate(`/pj/clientes/${client.id}`); }}>
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SalesGoalForm open={goalFormOpen} onOpenChange={setGoalFormOpen} />
      <ProspectForm
        open={prospectFormOpen}
        onOpenChange={handleCloseProspectForm}
        editingProspect={editingProspect}
      />
      <ProspectDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        prospect={detailProspect}
        onEdit={handleEditFromDetail}
      />
      <CloseProspectModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        prospect={closeProspect}
        onSuccess={() => {}}
      />
    </div>
  );
}
