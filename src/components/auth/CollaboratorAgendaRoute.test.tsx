import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CollaboratorRoute } from './CollaboratorRoute';
import { CollaboratorAgendaRoute } from './CollaboratorAgendaRoute';

// The gate is driven by the real useCollaboratorPermissions hook: only the
// Supabase client and the identity are replaced, so PERM-03 (a missing
// permission row falls back to the schema default) is exercised for real.

const { supabase, permissionRows, role, setRows } = vi.hoisted(() => {
  const rows: { feature_key: string; enabled: boolean }[] = [];
  const state = { role: 'collaborator' as string | null };
  const builder: any = {};
  for (const m of ['select', 'eq', 'order', 'limit']) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve({ data: [...rows], error: null }).then(resolve, reject);

  return {
    supabase: { from: vi.fn(() => builder), rpc: vi.fn() },
    permissionRows: rows,
    role: state,
    setRows: (next: { feature_key: string; enabled: boolean }[]) => {
      rows.length = 0;
      rows.push(...next);
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'member-1' }, loading: false }),
  useAuthContextSafe: () => ({ user: { id: 'member-1' }, loading: false }),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ data: role.role, isLoading: false }),
}));

function renderGate() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/colaborador/agenda']}>
        <Routes>
          <Route path="/colaborador/agenda" element={
            <CollaboratorRoute>
              <CollaboratorAgendaRoute>
                <div>AGENDA-PAGE</div>
              </CollaboratorAgendaRoute>
            </CollaboratorRoute>
          } />
          <Route path="/colaborador" element={<div>COLABORADOR-PORTAL</div>} />
          <Route path="/caixa" element={<div>CAIXA-PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setRows([]);
  role.role = 'collaborator';
});

describe('CollaboratorAgendaRoute', () => {
  it('renders the agenda for a collaborator whose flag is on (PERM-01)', async () => {
    setRows([{ feature_key: 'agenda', enabled: true }]);
    renderGate();

    await waitFor(() => expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument());
  });

  it('redirects to /colaborador when the flag is off (PERM-01, PERM-02)', async () => {
    setRows([{ feature_key: 'agenda', enabled: false }]);
    renderGate();

    await waitFor(() => expect(screen.getByText('COLABORADOR-PORTAL')).toBeInTheDocument());
    expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument();
  });

  it('grants access when no permission row exists, using the schema default (PERM-03)', async () => {
    setRows([]);
    renderGate();

    await waitFor(() => expect(screen.getByText('AGENDA-PAGE')).toBeInTheDocument());
    expect(screen.queryByText('COLABORADOR-PORTAL')).not.toBeInTheDocument();
  });

  it('bounces a manager typing the URL to /caixa', async () => {
    setRows([{ feature_key: 'agenda', enabled: true }]);
    role.role = 'manager';
    renderGate();

    await waitFor(() => expect(screen.getByText('CAIXA-PAGE')).toBeInTheDocument());
    expect(screen.queryByText('AGENDA-PAGE')).not.toBeInTheDocument();
  });

  it('bounces a non-collaborator exactly as CollaboratorRoute already does', async () => {
    role.role = 'admin';
    renderGate();

    await waitFor(() => expect(screen.getByText('CAIXA-PAGE')).toBeInTheDocument());
  });

  it('is registered in App.tsx under CollaboratorRoute, like /colaborador (design R6)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const appSource = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'App.tsx'),
      'utf-8',
    );

    const routeStart = appSource.indexOf('path="/colaborador/agenda"');
    expect(routeStart).toBeGreaterThan(-1);
    const routeBlock = appSource.slice(routeStart, appSource.indexOf('path="', routeStart + 10));

    expect(routeBlock).toContain('<CollaboratorRoute>');
    expect(routeBlock).toContain('<CollaboratorAgendaRoute>');
    expect(routeBlock).toContain('<ColaboratorAgendaPage />');
  });
});
