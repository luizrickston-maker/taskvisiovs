import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileNav } from './MobileNav';

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
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContextSafe: () => ({ user: { id: 'member-1' }, signOut: vi.fn() }),
}));

function renderNav() {
  return render(
    <MemoryRouter initialEntries={['/colaborador']}>
      <MobileNav />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  role.value = 'collaborator';
  canAgenda.value = true;
});

describe('MobileNav collaborator agenda entry (PERM-01)', () => {
  it('shows the agenda entry for a collaborator whose flag is on', () => {
    renderNav();

    const link = screen.getByRole('link', { name: /Agenda/ });
    expect(link).toHaveAttribute('href', '/colaborador/agenda');
    expect(screen.getByRole('link', { name: /Meu Painel/ })).toHaveAttribute('href', '/colaborador');
  });

  it('hides the agenda entry when the flag is off', () => {
    canAgenda.value = false;
    renderNav();

    expect(screen.queryByRole('link', { name: /Agenda/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Meu Painel/ })).toBeInTheDocument();
  });

  it('never shows the collaborator agenda to a manager', () => {
    role.value = 'manager';
    renderNav();

    expect(screen.queryByRole('link', { name: /Agenda/ })).not.toBeInTheDocument();
  });
});
