import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollaboratorSelector, collaboratorOptionsFromTeam } from './CollaboratorSelector';
import { useAppStore } from '@/stores/useAppStore';
import type { CorporateTeamMember } from '@/types/database';

// ─────────────────────────────────────────────
// MGR-01 fixes the option set by row attributes, so the fixture covers each
// attribute the spec filters on: active+account, deactivated, no account.
// ─────────────────────────────────────────────

function member(overrides: Partial<CorporateTeamMember>): CorporateTeamMember {
  return {
    id: `row-${Math.random().toString(36).slice(2)}`,
    clt_benefits: null,
    contract_type: 'pj',
    cost: 0,
    created_at: '2026-01-01T00:00:00Z',
    hours_available: null,
    is_active: true,
    name: 'Sem nome',
    notes: null,
    payment_day: 5,
    role: 'Colaborador',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'manager-1',
    workspace_id: 'ws-1',
    member_user_id: null,
    whatsapp: null,
    ...overrides,
  };
}

const MARIA = member({ id: 'row-maria', name: 'Maria Silva', member_user_id: 'uid-maria' });
const JOAO = member({ id: 'row-joao', name: 'João Pereira', member_user_id: 'uid-joao' });
/** MGR-01: `is_active = false` is out. */
const CARLOS = member({ id: 'row-carlos', name: 'Carlos Dias', is_active: false, member_user_id: 'uid-carlos' });
/** COLAB-11: no account (`member_user_id IS NULL`) is out. */
const DEBORA = member({ id: 'row-debora', name: 'Débora Lima', member_user_id: null });

const TEAM = [CARLOS, MARIA, DEBORA, JOAO];

beforeEach(() => {
  useAppStore.setState({ corporateTeam: TEAM });
});

/** Radix Select opens on pointerdown. */
async function openSelect() {
  const trigger = screen.getByLabelText('Colaborador');
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  return trigger;
}

describe('collaboratorOptionsFromTeam (MGR-01, COLAB-11)', () => {
  it('keeps exactly the rows that are active and hold an account', () => {
    expect(collaboratorOptionsFromTeam(TEAM)).toEqual([
      { id: 'uid-maria', name: 'Maria Silva', role: 'Colaborador' },
      { id: 'uid-joao', name: 'João Pereira', role: 'Colaborador' },
    ]);
  });

  it('excludes a deactivated row even when it holds an account', () => {
    const ids = collaboratorOptionsFromTeam([MARIA, CARLOS]).map(option => option.id);
    expect(ids).not.toContain('uid-carlos');
  });

  it('excludes a row without member_user_id even when it is active', () => {
    const ids = collaboratorOptionsFromTeam([MARIA, DEBORA]).map(option => option.id);
    expect(ids).not.toContain('uid-debora');
    expect(collaboratorOptionsFromTeam([DEBORA])).toEqual([]);
  });

  it('excludes null and undefined member_user_id alike', () => {
    const withoutAccount = member({ id: 'row-x', member_user_id: undefined });
    expect(collaboratorOptionsFromTeam([withoutAccount])).toEqual([]);
  });
});

describe('CollaboratorSelector', () => {
  it('offers only active collaborators with an account', async () => {
    render(<CollaboratorSelector value={null} onChange={vi.fn()} />);

    await openSelect();
    const labels = screen.getAllByRole('option').map(option => option.textContent);

    expect(labels).toContain('Maria Silva');
    expect(labels).toContain('João Pereira');
    expect(labels).not.toContain('Carlos Dias');
    expect(labels).not.toContain('Débora Lima');
  });

  it('defaults to the manager\'s own calendar (MGR-02)', async () => {
    render(<CollaboratorSelector value={null} onChange={vi.fn()} />);

    // The entry on screen is the one that reports null — i.e. the own calendar.
    await openSelect();
    const ownEntry = screen.getAllByRole('option')[0];
    const ownLabel = ownEntry.textContent;
    fireEvent.click(ownEntry);
    expect(screen.getByLabelText('Colaborador').textContent).toBe(ownLabel);
  });

  it('reports null when the own calendar is chosen', async () => {
    const onChange = vi.fn();
    render(<CollaboratorSelector value="uid-maria" onChange={onChange} />);

    await openSelect();
    // The first entry is the own calendar — never the internal sentinel.
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('reports the member_user_id when a collaborator is picked', async () => {
    const onChange = vi.fn();
    render(<CollaboratorSelector value={null} onChange={onChange} />);

    await openSelect();
    fireEvent.click(screen.getByRole('option', { name: 'Maria Silva' }));
    expect(onChange).toHaveBeenLastCalledWith('uid-maria');
  });

  it('reflects a collaborator selection in the trigger', async () => {
    render(<CollaboratorSelector value="uid-joao" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Colaborador').textContent).toBe('João Pereira');
  });
});
