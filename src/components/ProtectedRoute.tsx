import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuthContext();
  const { isLoading } = useAppStore();
  const location = useLocation();
  const [isInitialCheck, setIsInitialCheck] = useState(true);

  // Aguardar um ciclo para garantir que o estado de auth foi propagado
  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => {
        setIsInitialCheck(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  // Mostrar loading enquanto verifica autenticação inicial
  if (authLoading || isInitialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
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
