import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalInfo } from '@/hooks/useClientPortalInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, ExternalLink, Video, Image, FileText, HardDrive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientContent {
  id: string;
  type: string;
  title: string;
  drive_link: string;
  notes: string | null;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4 text-primary" />,
  photo: <Image className="w-4 h-4 text-primary" />,
  document: <FileText className="w-4 h-4 text-primary" />,
  other: <HardDrive className="w-4 h-4 text-muted-foreground" />,
};

const typeLabels: Record<string, string> = {
  video: 'Vídeo',
  photo: 'Foto',
  document: 'Documento',
  other: 'Outro',
};

export function PortalContents() {
  const { data: portalInfo } = useClientPortalInfo();

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['portal-contents', portalInfo?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contents')
        .select('id, type, title, drive_link, notes, created_at')
        .eq('client_id', portalInfo!.client_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientContent[];
    },
    enabled: !!portalInfo?.client_id,
  });

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          Meus Conteúdos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
          </div>
        ) : contents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Nenhum conteúdo disponível</p>
              <p className="text-xs text-muted-foreground mt-1">
                Os conteúdos preparados para você aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {contents.map(content => (
              <div
                key={content.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="shrink-0">
                  {typeIcons[content.type] ?? typeIcons.other}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground truncate">{content.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {typeLabels[content.type] ?? content.type}
                    </Badge>
                  </div>
                  {content.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{content.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(content.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => window.open(content.drive_link, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
