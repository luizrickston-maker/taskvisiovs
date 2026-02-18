import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, CalendarDays, Building2 } from 'lucide-react';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { useClientPortalInfo } from '@/hooks/useClientPortalInfo';
import { Skeleton } from '@/components/ui/skeleton';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const authContext = useAuthContextSafe();
  const { data: portalInfo, isLoading } = useClientPortalInfo();

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
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center glow-primary">
              <CalendarDays className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground leading-none">
                Portal do Cliente
              </span>
              {isLoading ? (
                <Skeleton className="h-3 w-28 mt-1" />
              ) : portalInfo ? (
                <span className="text-xs text-muted-foreground leading-none mt-0.5 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" />
                  {portalInfo.client_company || portalInfo.client_name}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {authContext?.user?.email}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
