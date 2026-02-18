import { Navigate } from 'react-router-dom';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { useIsClientPortalUser } from '@/hooks/useClientPortalInfo';
import { Loader2 } from 'lucide-react';

interface ClientPortalRouteProps {
  children: React.ReactNode;
}

/**
 * Guards /portal routes — only client portal users can access.
 * Regular workspace members are redirected to /caixa.
 */
export function ClientPortalRoute({ children }: ClientPortalRouteProps) {
  const authContext = useAuthContextSafe();
  const { data: isClientUser, isLoading } = useIsClientPortalUser();

  if (!authContext?.user) {
    return <Navigate to="/auth" replace />;
  }

  if (authContext.loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Regular workspace member tried to access portal
  if (isClientUser === false) {
    return <Navigate to="/caixa" replace />;
  }

  return <>{children}</>;
}
