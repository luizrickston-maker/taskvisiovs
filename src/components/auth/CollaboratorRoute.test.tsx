import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CollaboratorRoute } from './CollaboratorRoute';
import Auth from '@/pages/Auth';

// Edge Case: "IF the deep link is opened by a user who is not authenticated,
// THEN the system SHALL route to /auth and return to /colaborador/agenda after
// a successful session is established." The WhatsApp message is the entry point
// of the whole loop, so the guard and the login page have to hand the origin to
// each other.

const { auth } = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: auth.user, loading: false }),
  useAuthContextSafe: () => ({ user: auth.user, loading: false }),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ data: 'collaborator', isLoading: false }),
}));

/** Shows where the guard said the visitor originally wanted to go. */
function OriginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from;
  return <p>ORIGIN: {from?.pathname ?? 'none'}</p>;
}

/** The app's own stack for the deep link, minus the pieces not under test. */
function deepLinkTree() {
  return (
    <MemoryRouter initialEntries={['/colaborador/agenda']}>
      <Routes>
        <Route
          path="/colaborador/agenda"
          element={
            <CollaboratorRoute>
              <div>AGENDA-PAGE</div>
            </CollaboratorRoute>
          }
        />
        <Route
          path="/auth"
          element={
            <>
              <Auth />
              <OriginProbe />
            </>
          }
        />
        <Route path="/" element={<div>ROOT</div>} />
        <Route path="/colaborador" element={<div>COLABORADOR-PORTAL</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  auth.user = null;
});

describe('CollaboratorRoute — unauthenticated deep link (Edge Cases)', () => {
  it('routes to /auth carrying the origin as location state', async () => {
    render(deepLinkTree());

    // The login screen is up and the agenda is not.
    expect(await screen.findByRole('button', { name: /Acessar/ })).toBeInTheDocument();
    expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument();
    // The origin travels with the redirect, so /auth can return to it.
    await waitFor(() =>
      expect(screen.getByText('ORIGIN: /colaborador/agenda')).toBeInTheDocument(),
    );
  });

  it('returns the collaborator to /colaborador/agenda once the session appears', async () => {
    const { rerender } = render(deepLinkTree());
    await screen.findByRole('button', { name: /Acessar/ });

    // A session is established while the visitor is still on /auth.
    auth.user = { id: 'member-1' };
    rerender(deepLinkTree());

    await waitFor(() => expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument());
    // …and not to the root, which RootRedirect would send on to /colaborador.
    expect(screen.queryByText('ROOT')).not.toBeInTheDocument();
    expect(screen.queryByText('COLABORADOR-PORTAL')).not.toBeInTheDocument();
  });
});
