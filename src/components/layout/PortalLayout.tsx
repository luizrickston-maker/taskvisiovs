import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, CalendarDays, Building2, ShieldOff, Loader2 } from 'lucide-react';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { useClientPortalInfo } from '@/hooks/useClientPortalInfo';
import { useClientAccessRealtime } from '@/hooks/useClientAccessRealtime';
import { Skeleton } from '@/components/ui/skeleton';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const authContext = useAuthContextSafe();
  const { data: portalInfo, isLoading } = useClientPortalInfo();
  const accessStatus = useClientAccessRealtime(portalInfo?.workspace_id);

  const handleSignOut = async () => {
    if (authContext?.signOut) {
      await authContext.signOut();
    }
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center glow-primary shrink-0">
              <CalendarDays className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-foreground leading-none">
                Portal do Cliente
              </span>
              {isLoading ? (
                <Skeleton className="h-3 w-24 mt-1" />
              ) : portalInfo ? (
                <span className="text-xs text-muted-foreground leading-none mt-0.5 flex items-center gap-1 truncate">
                  <Building2 className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{portalInfo.client_company || portalInfo.client_name}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden md:block truncate max-w-[180px]">
              {authContext?.user?.email}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 sm:gap-2 text-muted-foreground hover:text-destructive px-2 sm:px-3"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs sm:text-sm">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {accessStatus === 'loading' ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Verificando acesso...</p>
          </div>
        ) : accessStatus === 'inactive' ? (
          /* Blocked state — shown instantly via realtime */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 px-4">
            <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <ShieldOff className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-semibold text-foreground">Acesso suspenso</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                O seu acesso a este portal foi temporariamente desativado.
                Entre em contato com a agência para mais informações.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/50 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" />
              Aguardando reativação em tempo real...
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
