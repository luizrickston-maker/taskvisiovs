import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface CollaboratorRouteProps {
  children: React.ReactNode;
}

/**
 * Guard de rota para o portal do colaborador.
 * Permite acesso apenas a usuários com role 'collaborator'.
 * Managers/admins são redirecionados para /caixa.
 */
export function CollaboratorRoute({ children }: CollaboratorRouteProps) {
  const { user, loading: authLoading } = useAuthContext();
  const { data: role, isLoading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Admins e gestores têm acesso ao painel completo — redireciona para área deles
  if (role && role !== 'collaborator') return <Navigate to="/caixa" replace />;

  return <>{children}</>;
}