import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjetosDashboard from './ProjetosDashboard';
import { useAppStore } from '@/stores/useAppStore';

// PRC-02 (caller half) — the personal dashboard mounts the same wizard, so it
// must ask for `is_corporate = false`. An unconditional `true` in the wizard
// would mislabel every project created here and corrupt `corporate_count`,
// which four migrations compute.

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

beforeEach(() => {
  wizardProps.length = 0;
  useAppStore.setState({
    projects: [],
    projectTasks: [],
    projectStages: [],
    projectCategories: [],
  });
});

describe('ProjetosDashboard — wizard caller (PRC-02)', () => {
  it('mounts the wizard as a personal (non corporate) creator', () => {
    render(
      <MemoryRouter initialEntries={['/projetos']}>
        <ProjetosDashboard />
      </MemoryRouter>,
    );

    expect(wizardProps.at(-1)?.isCorporate).toBe(false);
  });
});
