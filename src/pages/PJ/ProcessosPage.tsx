import { Workflow, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProcessosPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Workflow className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Processos
            </h1>
            <p className="text-sm text-muted-foreground">
              Canvas de operações e fluxos de trabalho
            </p>
          </div>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Processo
        </Button>
      </div>

      <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <Workflow className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">
          Nenhum processo criado ainda
        </h2>
        <p className="text-muted-foreground max-w-md">
          Crie seu primeiro processo para documentar fluxos de trabalho, SOPs e manuais de operação de forma visual e interativa.
        </p>
        <Button className="gap-2 mt-2">
          <Plus className="w-4 h-4" />
          Criar Primeiro Processo
        </Button>
      </div>
    </div>
  );
}
