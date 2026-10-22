import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { ClientTaskForm, INVALID_ASSIGNEE_ERROR } from './ClientTaskForm';
import { useAppStore } from '@/stores/useAppStore';
import type { CorporateTeamMember, Project, ProjectStage } from '@/types/database';

// TSK-01…05 — the form produced two "no assignee" sentinels (`''` from the
// initial state, `'none'` from "Nenhum (Somente eu)") and the schema rejected
// both, so the ordinary path never reached the database. Validation now runs
// on the mapped payload, a value that is neither a UUID nor a sentinel is
// refused with a visible error and no insert, and manual inserts carry
// workspace_id (TSK-04, plus the Edge Case where it cannot be resolved).

const { supabase, queueResult, queueRpc, insertsFor, reset } = vi.hoisted(() => {
  type Result = { data?: unknown; error?: unknown };
  const log: { table: string; method: string; args: unknown[] }[] = [];
  const results = new Map<string, Result[]>();
  const rpcResults = new Map<string, Result[]>();

  const enqueue = (map: Map<string, Result[]>, key: string, result: Result) => {
    const bucket = map.get(key) ?? [];
    bucket.push(result);
    map.set(key, bucket);
  };

  function makeBuilder(table: string) {
    const builder: Record<string, unknown> = {};
    let terminal = 'select';
    for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
      builder[method] = (...args: unknown[]) => {
        log.push({ table, method, args });
        if (method === 'insert' || method === 'update' || method === 'delete') terminal = method;
        return builder;
      };
    }
    builder.then = (resolve: unknown, reject: unknown) => {
      const bucket = results.get(`${table}.${terminal}`);
      const result = bucket && bucket.length > 0 ? bucket.shift()! : { data: null, error: null };
      return Promise.resolve(result).then(resolve as never, reject as never);
    };
    return builder;
  }

  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      rpc: (fn: string) => {
        const bucket = rpcResults.get(fn);
        const result = bucket && bucket.length > 0 ? bucket.shift()! : { data: null, error: null };
        return Promise.resolve(result);
      },
    },
    queueResult: (table: string, method: string, result: Result) =>
      enqueue(results, `${table}.${method}`, result),
    queueRpc: (fn: string, result: Result) => rpcResults.set(fn, [result]),
    insertsFor: (table: string) =>
      log.filter((c) => c.method === 'insert' && c.table === table).map((c) => c.args[0]),
    reset: () => {
      log.length = 0;
      results.clear();
      rpcResults.clear();
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_USER_ID = '22222222-2222-4222-8222-222222222222';

const PROJECT: Project = {
  client_name: null,
  company_name: null,
  created_at: '2026-01-01T00:00:00Z',
  deadline: null,
  estimated_time: null,
  id: 'p1',
  is_corporate: true,
  priority: 3,
  project: 'Projeto do Cliente',
  project_category_id: null,
  prospect_id: null,
  status: 'todo',
  task: 'Projeto do Cliente',
  updated_at: '2026-01-01T00:00:00Z',
  user_id: 'user-1',
  workspace_id: WORKSPACE_ID,
};

const TEAM_MEMBER = {
  id: 'team-1',
  name: 'Maria Silva',
  role: 'Editor',
  is_active: true,
  member_user_id: MEMBER_USER_ID,
  user_id: 'user-1',
  workspace_id: WORKSPACE_ID,
} as unknown as CorporateTeamMember;

function seed({
  memberUserId = MEMBER_USER_ID,
}: { memberUserId?: string } = {}) {
  useAppStore.setState({
    projects: [PROJECT],
    projectStages: [],
    projectTasks: [],
    corporateTeam: [{ ...TEAM_MEMBER, member_user_id: memberUserId }],
  });
}

function renderForm() {
  const onOpenChange = vi.fn();
  render(<ClientTaskForm open onOpenChange={onOpenChange} projectId={PROJECT.id} />);
  return onOpenChange;
}

/** Opens a Radix Select by the text its trigger shows and picks an option. */
async function chooseOption(triggerText: string, optionName: string) {
  const trigger = screen.getByText(triggerText);
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

function fillTitle(title = 'Desenvolver homepage') {
  fireEvent.change(screen.getByPlaceholderText('Ex: Desenvolver homepage'), {
    target: { value: title },
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Criar Tarefa' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  reset();
  queueRpc('get_my_workspace_id', { data: WORKSPACE_ID, error: null });
  queueResult('project_tasks', 'insert', { data: { id: 't1' }, error: null });
  seed();
});

describe('ClientTaskForm — "no assignee" persists as null (TSK-01, TSK-02)', () => {
  it('persists assigned_to = null when the assignee field is empty (TSK-01)', async () => {
    renderForm();
    fillTitle();
    submit();

    await waitFor(() => expect(insertsFor('project_tasks')).toHaveLength(1));
    expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: null });
  });

  it("persists assigned_to = null when the select holds 'Nenhum (Somente eu)' (TSK-02)", async () => {
    renderForm();
    fillTitle();
    await chooseOption('Selecione um colaborador (opcional)', 'Nenhum (Somente eu)');
    submit();

    await waitFor(() => expect(insertsFor('project_tasks')).toHaveLength(1));
    expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: null });
  });

  it('passes a real collaborator UUID through unchanged (Edge Case)', async () => {
    renderForm();
    fillTitle();
    await chooseOption('Selecione um colaborador (opcional)', /Maria Silva/);
    submit();

    await waitFor(() => expect(insertsFor('project_tasks')).toHaveLength(1));
    expect(insertsFor('project_tasks')[0]).toMatchObject({ assigned_to: MEMBER_USER_ID });
  });
});

describe('ClientTaskForm — a malformed assignee is refused (TSK-03, TSK-05)', () => {
  it('refuses the submission with a visible error and sends no insert', async () => {
    // The only value that is neither a sentinel nor a UUID the UI can hold:
    // a collaborator row carrying a non-UUID user id.
    seed({ memberUserId: 'not-a-uuid' });
    const onOpenChange = renderForm();
    fillTitle();
    await chooseOption('Selecione um colaborador (opcional)', /Maria Silva/);
    submit();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(INVALID_ASSIGNEE_ERROR),
    );
    expect(INVALID_ASSIGNEE_ERROR).toBe(
      'Colaborador inválido: escolha um integrante da equipe ou deixe sem atribuição.',
    );
    expect(insertsFor('project_tasks')).toHaveLength(0);
    // The dialog stays open, so the user still sees the error and can fix it.
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('ClientTaskForm — manual inserts carry workspace_id (TSK-04)', () => {
  it('persists workspace_id on the created row', async () => {
    renderForm();
    fillTitle();
    submit();

    await waitFor(() => expect(insertsFor('project_tasks')).toHaveLength(1));
    expect(insertsFor('project_tasks')[0]).toMatchObject({
      workspace_id: WORKSPACE_ID,
      user_id: 'user-1',
      project_id: PROJECT.id,
    });
  });

  it('refuses the submission when the workspace cannot be resolved (Edge Case)', async () => {
    queueRpc('get_my_workspace_id', { data: null, error: null });
    renderForm();
    fillTitle();
    submit();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não foi possível identificar seu workspace.'),
    );
    expect(insertsFor('project_tasks')).toHaveLength(0);
  });
});
