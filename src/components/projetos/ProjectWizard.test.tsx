import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectWizard from './ProjectWizard';
import { useAppStore } from '@/stores/useAppStore';
import type { Project } from '@/types/database';

// PRC-01 / PRC-02 / PRC-04 — "WHEN the wizard is opened from `/pj/projetos`
// and a project is created THEN the system SHALL persist that row with
// `is_corporate = true`", the same for `/projetos` with `false`, and
// "WHERE the wizard creates a project, the system SHALL preserve every other
// field of the payload unchanged".
//
// Edge Case — a caller that passes no prop must keep today's behaviour, so
// the default is `false`.
//
// The wizard is driven through its three steps and the assertion lands on the
// row that reaches Postgres, not on component state.

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
      auth: {
        getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
      },
    },
    queueResult: (table: string, method: string, result: Result) =>
      enqueue(results, `${table}.${method}`, result),
    queueRpc: (fn: string, result: Result) => enqueue(rpcResults, fn, result),
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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CREATED_ROW = {
  id: 'p-new',
  user_id: 'user-1',
  workspace_id: 'ws-1',
  project: 'Campanha Verao 2026',
  task: 'Campanha Verao 2026',
  status: 'todo',
  priority: 3,
  is_corporate: true,
} as unknown as Project;

beforeEach(() => {
  reset();
  queueRpc('get_my_workspace_id', { data: 'ws-1', error: null });
  queueResult('projects', 'insert', { data: CREATED_ROW, error: null });
  queueResult('projects', 'update', { data: null, error: null });
  queueResult('project_stages', 'insert', { data: [], error: null });
  useAppStore.setState({ projects: [], projectStages: [], projectCategories: [] });
});

/** Walks the three wizard steps and submits the create form. */
async function createProjectFrom(isCorporate?: boolean) {
  render(
    <ProjectWizard
      open
      onOpenChange={vi.fn()}
      {...(isCorporate === undefined ? {} : { isCorporate })}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText('Ex: Campanha Verão 2025'), {
    target: { value: 'Campanha Verao 2026' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

  fireEvent.click(screen.getByRole('button', { name: /^Etapa$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

  fireEvent.click(screen.getByRole('button', { name: /Criar projeto/ }));
  await waitFor(() => expect(insertsFor('projects')).toHaveLength(1));
  return insertsFor('projects')[0] as Record<string, unknown>;
}

describe('ProjectWizard — is_corporate comes from the mounting page (PRC-01, PRC-02)', () => {
  it('persists is_corporate = true when the caller asks for a corporate project (PRC-01)', async () => {
    const payload = await createProjectFrom(true);
    expect(payload.is_corporate).toBe(true);
  });

  it('persists is_corporate = false when the caller asks for a personal project (PRC-02)', async () => {
    const payload = await createProjectFrom(false);
    expect(payload.is_corporate).toBe(false);
  });

  it('defaults to false when the caller passes no prop (Edge Case)', async () => {
    const payload = await createProjectFrom(undefined);
    expect(payload.is_corporate).toBe(false);
  });
});

describe('ProjectWizard — payload stays otherwise unchanged (PRC-04)', () => {
  it('sends every other field of the create payload exactly as before', async () => {
    const payload = await createProjectFrom(true);

    expect(payload).toEqual({
      user_id: 'user-1',
      workspace_id: 'ws-1',
      project: 'Campanha Verao 2026',
      task: 'Campanha Verao 2026',
      project_category_id: null,
      priority: 3,
      status: 'todo',
      estimated_time: null,
      deadline: null,
      assigned_to: null,
      client_name: null,
      is_corporate: true,
    });
  });
});
