import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjetosClientesPage from './ProjetosClientesPage';
import { useAppStore } from '@/stores/useAppStore';
import type { Project } from '@/types/database';

// PRC-01 (caller half) — the page that mounts the wizard tells it the project
// it creates is corporate. The wizard itself is doubled and the prop it
// receives is asserted, so a caller that forgets or flips the flag fails here.
//
// PRC-03 — "WHEN a project is created from `/pj/projetos` THEN the system
// SHALL include it in `corporateProjects` on that page without requiring a
// reload", and the Independent Test's negative half: a `false` flag stays out
// of that list.

const { wizardProps } = vi.hoisted(() => ({
  wizardProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/components/projetos/ProjectWizard', () => ({
  default: (props: Record<string, unknown>) => {
    wizardProps.push(props);
    return null;
  },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const builder: Record<string, unknown> = {};
      for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
        builder[method] = () => builder;
      }
      builder.then = (resolve: unknown, reject: unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve as never, reject as never);
      return builder;
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function project(id: string, name: string, isCorporate: boolean): Project {
  return {
    client_name: null,
    company_name: null,
    created_at: '2026-01-01T00:00:00Z',
    deadline: null,
    estimated_time: null,
    id,
    is_corporate: isCorporate,
    priority: 3,
    project: name,
    project_category_id: null,
    prospect_id: null,
    status: 'todo',
    task: name,
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    workspace_id: 'ws-1',
  };
}

const PERSONAL = project('p-personal', 'Projeto Pessoal', false);
const CORPORATE = project('p-corporate', 'Projeto do Cliente', true);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pj/projetos']}>
      <ProjetosClientesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  wizardProps.length = 0;
  useAppStore.setState({ projects: [], projectTasks: [], projectStages: [] });
});

describe('ProjetosClientesPage — wizard caller (PRC-01)', () => {
  it('mounts the wizard as a corporate creator', () => {
    renderPage();
    expect(wizardProps.at(-1)?.isCorporate).toBe(true);
  });
});

describe('ProjetosClientesPage — corporateProjects list (PRC-03)', () => {
  it('shows a corporate project as soon as the store holds it and keeps is_corporate = false out', async () => {
    useAppStore.setState({ projects: [PERSONAL] });
    renderPage();

    // A project that fails the is_corporate filter is not listed.
    expect(screen.getByText('Nenhum projeto encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Projeto Pessoal')).not.toBeInTheDocument();

    // The wizard writes the row and calls addProject: the page must pick the
    // new corporate project up from the store with no reload.
    act(() => {
      useAppStore.setState({ projects: [PERSONAL, CORPORATE] });
    });

    expect(await screen.findByText('Projeto do Cliente')).toBeInTheDocument();
    expect(screen.queryByText('Projeto Pessoal')).not.toBeInTheDocument();
  });
});
