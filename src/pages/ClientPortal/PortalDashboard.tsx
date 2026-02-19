import { useClientPortalInfo } from '@/hooks/useClientPortalInfo';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { PortalCalendar } from './PortalCalendar';
import { PortalContents } from './PortalContents';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Mail, ShieldCheck, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PortalDashboard() {
  const { data: portalInfo, isLoading } = useClientPortalInfo();

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Welcome card */}
        <Card className="glass-card border-primary/20">
          <CardContent className="pt-5 pb-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : portalInfo ? (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-display font-semibold text-foreground">
                    Olá, {portalInfo.client_name} 👋
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bem-vindo ao seu portal. Aqui você acompanha o progresso dos seus conteúdos.
                  </p>
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {portalInfo.client_company && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        {portalInfo.client_company}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      {portalInfo.email}
                    </span>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 text-xs gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Acesso ativo
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando informações do cliente...</p>
            )}
          </CardContent>
        </Card>

        {/* Content Calendar + Client Contents */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : portalInfo ? (
          <>
            <PortalCalendar workspaceId={portalInfo.workspace_id} clientId={portalInfo.client_id} />
            <PortalContents />
          </>
        ) : null}
      </div>
    </PortalLayout>
  );
}

