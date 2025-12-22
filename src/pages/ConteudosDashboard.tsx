import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConteudosDashboard() {
  return (
    <div className="p-4 md:p-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Conteúdos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Em breve: Visualização de roteiros por data.</p>
        </CardContent>
      </Card>
    </div>
  );
}
