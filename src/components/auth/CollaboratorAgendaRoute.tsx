import { Navigate } from 'react-router-dom';
import { useCollaboratorPermissions } from '@/hooks/useCollaboratorPermissions';

interface CollaboratorAgendaRouteProps {
  children: React.ReactNode;
}

/**
 * PERM-02: `/colaborador/agenda` is reachable only while the existing `agenda`
 * permission key is on. A missing permission row keeps the schema default
 * (enabled), and while the flag is still loading `can()` holds that default,
 * so the route never flashes a redirect.
 */
export function CollaboratorAgendaRoute({ children }: CollaboratorAgendaRouteProps) {
  const { can } = useCollaboratorPermissions();

  if (!can('agenda')) return <Navigate to="/colaborador" replace />;

  return <>{children}</>;
}
