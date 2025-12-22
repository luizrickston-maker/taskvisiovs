import { FolderKanban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjetosDashboard() {
  return (
    <div className="p-4 md:p-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            Projetos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve: Gestão de projetos com prioridades e status.</p>
        </CardContent>
      </Card>
    </div>
  );
}
