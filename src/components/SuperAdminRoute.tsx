import { Navigate } from 'react-router-dom';
import { Loader2, ShieldX } from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuthContextSafe } from '@/contexts/AuthContext';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const authContext = useAuthContextSafe();
  const { isSuperAdmin, isLoading } = useSuperAdmin();

  if (!authContext || authContext.loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!authContext.user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <ShieldX className="w-16 h-16 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground max-w-sm">
            Você não tem permissão para acessar o painel de administração.
          </p>
          <Navigate to="/caixa" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
