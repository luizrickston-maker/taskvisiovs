import { Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FocoDashboard() {
  return (
    <div className="p-4 md:p-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Foco & Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve: Inbox Mental, Ações de Hoje e Agenda 48h.</p>
        </CardContent>
      </Card>
    </div>
  );
}
