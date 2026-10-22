import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectDetailPage from './ProjectDetailPage';
import { useAppStore } from '@/stores/useAppStore';
import type { CorporateTeamMember, Project, ProjectStage, ProjectTask } from '@/types/database';

// STG-04 — "WHEN the Etapas tab renders a project's tasks THEN the system
// SHALL show tasks with no stage in an explicit `Sem etapa` group rather than
// omitting them". The tab used to filter `t.stage_id === stage.id` only, so a
// task inserted without a stage looked like the insert had failed.
//
// STG-05 — "WHEN a task is created from the 'Adicionar tarefa nesta etapa'
// action THEN the system SHALL pre-fill that stage in the form".

const { supabase, queueResult, queueRpc, insertsFor, reset } = vi.hoisted(() => {
  type Result = { data?: unknown; error?: unknown };
  const log: { table: string; method: string; args: unknown[] }[] = [];
  const results = new Map<string, Result[]>();

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
        const bucket = results.get(`rpc.${fn}`);
        const result = bucket && bucket.length > 0 ? bucket.shift()! : { data: null, error: null };
        return Promise.resolve(result);
      },
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
    },
    queueResult: (table: string, method: string, result: Result) => {
      const key = `${table}.${method}`;
      const bucket = results.get(key) ?? [];
      bucket.push(result);
      results.set(key, bucket);
    },
    queueRpc: (fn: string, result: Result) => results.set(`rpc.${fn}`, [result]),
    insertsFor: (table: string) =>
      log.filter((c) => c.method === 'insert' && c.table === table).map((c) => c.args[0]),
    reset: () => {
      log.length = 0;
      results.clear();
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const STAGE_ID = '33333333-3333-4333-8333-333333333333';
const TEAM_MEMBER_USER_ID = '22222222-2222-4222-8222-222222222222';

const PROJECT: Project = {
  client_name: null,
  company_name: null,
  created_at: '2026-01-01T00:00:00Z',
  deadline: null,
  estimated_time: null,
  id: 'p1',
  is_corporate: false,
  priority: 3,
  project: 'Projeto Pessoal',
  project_category_id: null,
  prospect_id: null,
  status: 'todo',
  task: 'Projeto Pessoal',
  updated_at: '2026-01-01T00:00:00Z',
  user_id: 'user-1',
  workspace_id: WORKSPACE_ID,
};

const BRIEFING: ProjectStage = {
  id: STAGE_ID,
  user_id: 'user-1',
  workspace_id: WORKSPACE_ID,
  project_id: PROJECT.id,
  name: 'Briefing',
  icon: 'Layers',
  order_index: 0,
  status: 'todo',
  sla_days: null,
  deadline: null,
  notes: null,
  started_at: null,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  template_id: null,
} as unknown as ProjectStage;

function task(id: string, title: string, stageId: string | null): ProjectTask {
  return {
    id,
    user_id: 'user-1',
    workspace_id: WORKSPACE_ID,
    project_id: PROJECT.id,
    stage_id: stageId,
    title,
    description: null,
    status: 'todo',
    priority: 3,
    deadline: null,
    deadline_days: null,
    estimated_hours: null,
    actual_hours: null,
    completed_at: null,
    source_process_step_id: null,
    video_editing_briefing_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  } as unknown as ProjectTask;
}

function renderDetail({ stages, tasks }: { stages: ProjectStage[]; tasks: ProjectTask[] }) {
  useAppStore.setState({
    projects: [PROJECT],
    projectStages: stages,
    projectTasks: tasks,
    corporateTeam: [
      {
        id: 'team-1',
        name: 'Maria Silva',
        role: 'Editor',
        is_active: true,
        member_user_id: TEAM_MEMBER_USER_ID,
        user_id: 'user-1',
        workspace_id: WORKSPACE_ID,
      } as unknown as CorporateTeamMember,
    ],
  });

  return render(
    <MemoryRouter initialEntries={[`/pj/projetos/${PROJECT.id}`]}>
      <Routes>
        <Route path="/pj/projetos/:id" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  reset();
  queueRpc('get_my_workspace_id', { data: WORKSPACE_ID, error: null });
  queueResult('project_tasks', 'insert', { data: { id: 't-new' }, error: null });
});

describe('ProjectDetailPage — stageless tasks on the Etapas tab (STG-04)', () => {
  it('shows a task with no stage in an explicit "Sem etapa" group', () => {
    renderDetail({
      stages: [BRIEFING],
      tasks: [task('t-in', 'Tarefa da etapa', STAGE_ID), task('t-out', 'Tarefa sem etapa', null)],
    });

    expect(screen.getByText('Sem etapa')).toBeInTheDocument();
    expect(screen.getByText('Tarefa sem etapa')).toBeInTheDocument();
    // The staged task keeps rendering inside its own stage card.
    expect(screen.getByText('Tarefa da etapa')).toBeInTheDocument();
  });

  it('reaches the stageless tasks of a project that has no stages at all', () => {
    renderDetail({
      stages: [],
      tasks: [task('t-out', 'Tarefa sem etapa', null)],
    });

    expect(screen.getByText('Sem etapa')).toBeInTheDocument();
    expect(screen.getByText('Tarefa sem etapa')).toBeInTheDocument();
  });
});

describe('ProjectDetailPage — "Adicionar tarefa nesta etapa" (STG-05)', () => {
  it('pre-fills that stage in the task form and persists it on the insert', async () => {
    renderDetail({ stages: [BRIEFING], tasks: [] });

    fireEvent.click(screen.getByRole('button', { name: /Adicionar tarefa nesta etapa/ }));

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getAllByRole('combobox').some((trigger) => trigger.textContent === '1. Briefing'),
    ).toBe(true);

    fireEvent.change(within(dialog).getByPlaceholderText('Ex: Implementar autenticação'), {
      target: { value: 'Tarefa da etapa' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar' }));

    await waitFor(() => expect(insertsFor('project_tasks')).toHaveLength(1));
    expect(insertsFor('project_tasks')[0]).toMatchObject({
      stage_id: STAGE_ID,
      project_id: PROJECT.id,
    });
  });
});
