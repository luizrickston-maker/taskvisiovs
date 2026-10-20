import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const { role, canAgenda } = vi.hoisted(() => ({
  role: { value: 'collaborator' as string | null },
  canAgenda: { value: true },
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ data: role.value, isLoading: false }),
}));
vi.mock('@/hooks/useCollaboratorPermissions', () => ({
  useCollaboratorPermissions: () => ({ can: () => canAgenda.value, isLoading: false }),
}));
vi.mock('@/hooks/useSuperAdmin', () => ({ useSuperAdmin: () => ({ isSuperAdmin: false }) }));
vi.mock('@/hooks/useUserPreferences', () => ({ useUserPreferences: () => ({ appName: 'Meu App' }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContextSafe: () => ({ user: { id: 'member-1' }, signOut: vi.fn() }),
}));
vi.mock('@/components/layout/ContextSwitcher', () => ({
  ContextSwitcher: () => <div data-testid="context-switcher" />,
}));

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/colaborador']}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  role.value = 'collaborator';
  canAgenda.value = true;
});

describe('AppSidebar collaborator agenda entry (PERM-01)', () => {
  it('shows the agenda entry for a collaborator whose flag is on', () => {
    renderSidebar();

    const link = screen.getByRole('link', { name: /Agenda/ });
    expect(link).toHaveAttribute('href', '/colaborador/agenda');
    expect(screen.getByRole('link', { name: /Meu Painel/ })).toHaveAttribute('href', '/colaborador');
  });

  it('hides the agenda entry when the flag is off', () => {
    canAgenda.value = false;
    renderSidebar();

    expect(screen.queryByRole('link', { name: /Agenda/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Meu Painel/ })).toBeInTheDocument();
  });

  it('never shows the collaborator agenda to a manager', () => {
    role.value = 'manager';
    renderSidebar();

    // The manager's own business nav has its own "/pj/agenda" entry; the
    // collaborator route must not appear for them.
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'));
    expect(hrefs).not.toContain('/colaborador/agenda');
  });
});
