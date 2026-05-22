import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { useAppContext } from '@/hooks/useAppContext';
import { useIsClientPortalUser } from '@/hooks/useClientPortalInfo';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const authContext = useAuthContextSafe();
  const { isLoading } = useAppStore();
  const { mode } = useAppContext();
  const location = useLocation();
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const { data: isClientUser, isLoading: checkingClientUser } = useIsClientPortalUser();
  
  const authLoading = authContext?.loading ?? true;

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        setIsInitialCheck(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  if (!authContext || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Removemos o timer isInitialCheck que causava delay visual artificial e possível race condition


  const { user } = authContext;

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Client-only users must go to the portal, not the main app
  if (checkingClientUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isClientUser === true) {
    return <Navigate to="/portal" replace />;
  }

  // Business-only users redirect to commercial if they try to access personal routes
  const personalRoutes = ['/caixa', '/meu-dia', '/financas', '/planejamento', '/projetos', '/conteudos', '/roteiros', '/assistente-pessoal'];
  if (user.email === 'chapadadigitalbr@gmail.com' && personalRoutes.some(route => location.pathname.startsWith(route))) {
    return <Navigate to="/comercial" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
