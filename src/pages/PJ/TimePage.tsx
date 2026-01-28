import { Users } from 'lucide-react';
import { TeamManager } from '@/components/areapj/TeamManager';

export default function TimePage() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Gestão de Time</h1>
          <p className="text-sm text-muted-foreground">Colaboradores e custos da equipe</p>
        </div>
      </div>

      <TeamManager />
    </div>
  );
}
