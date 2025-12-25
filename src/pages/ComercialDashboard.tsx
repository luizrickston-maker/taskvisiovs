import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { SectionBoundary } from '@/components/SectionBoundary';
import { SalesGoalsSummary } from '@/components/comercial/SalesGoalsSummary';
import { SalesGoalForm } from '@/components/comercial/SalesGoalForm';
import { ProspectList } from '@/components/comercial/ProspectList';
import { ProspectForm } from '@/components/comercial/ProspectForm';
import type { Prospect } from '@/types/database';

export default function ComercialDashboard() {
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setProspectFormOpen(true);
  };

  const handleCloseProspectForm = (open: boolean) => {
    setProspectFormOpen(open);
    if (!open) {
      setEditingProspect(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gestão Comercial</h1>
          <p className="text-sm text-muted-foreground">Metas e pipeline de prospecção</p>
        </div>
      </div>

      {/* Resumo de Metas */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Resumo de Metas</h2>
        <SectionBoundary name="SalesGoalsSummary">
          <SalesGoalsSummary onAddGoal={() => setGoalFormOpen(true)} />
        </SectionBoundary>
      </section>

      {/* Pipeline de Prospecção */}
      <section>
        <SectionBoundary name="ProspectList">
          <ProspectList 
            onAddProspect={() => setProspectFormOpen(true)} 
            onEditProspect={handleEditProspect}
          />
        </SectionBoundary>
      </section>

      {/* Modals */}
      <SalesGoalForm open={goalFormOpen} onOpenChange={setGoalFormOpen} />
      <ProspectForm 
        open={prospectFormOpen} 
        onOpenChange={handleCloseProspectForm}
        editingProspect={editingProspect}
      />
    </div>
  );
}
