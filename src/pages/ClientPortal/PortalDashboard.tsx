import { useClientPortalInfo } from '@/hooks/useClientPortalInfo';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { PortalCalendar } from './PortalCalendar';
import { PortalContentTimeline } from './PortalContentTimeline';
import { PortalContents } from './PortalContents';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Mail, ShieldCheck, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PortalDashboard() {
  const { data: portalInfo, isLoading } = useClientPortalInfo();

  return (
    <PortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome card */}
        <Card className="glass-card border-primary/20">
          <CardContent className="pt-4 sm:pt-5 pb-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : portalInfo ? (
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-display font-semibold text-foreground truncate">
                    Olá, {portalInfo.client_name} 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Bem-vindo ao seu portal. Aqui você acompanha o progresso dos seus conteúdos.
                  </p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 flex-wrap">
                    {portalInfo.client_company && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{portalInfo.client_company}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground hidden sm:flex">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[160px] md:max-w-none">{portalInfo.email}</span>
                    </span>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 text-xs gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Acesso ativo
                    </Badge>
                  </div>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando informações do cliente...</p>
            )}
          </CardContent>
        </Card>

        {/* Content Calendar + Client Contents — side by side on large screens */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : portalInfo ? (
          <div className="space-y-4 sm:space-y-6">
            <PortalCalendar workspaceId={portalInfo.workspace_id} clientId={portalInfo.client_id} />
            <PortalContentTimeline workspaceId={portalInfo.workspace_id} clientId={portalInfo.client_id} />
            <PortalContents />
          </div>
        ) : null}
      </div>
    </PortalLayout>
  );
}

