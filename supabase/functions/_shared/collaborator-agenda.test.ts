import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  COLLABORATOR_AGENDA_URL,
  PJ_AGENDA_URL,
  buildAppointmentMessage,
  buildCollaboratorCancellationMessage,
  buildManagerCancellationMessage,
  formatRange,
} from './collaborator-agenda.ts';

const SOURCE_PATH = path.resolve(
  process.cwd(),
  'supabase/functions/_shared/collaborator-agenda.ts'
);

const base = {
  collaboratorName: 'Maria Silva',
  title: 'Reunião de alinhamento',
  date: '2026-11-05',
  startTime: '14:00',
  endTime: '16:00',
};

const linesOf = (message: string): string[] => message.split('\n');
const rangeLine = (lines: string[]): number => lines.findIndex((line) => line.includes('–'));
const linkLine = (lines: string[]): number =>
  lines.findIndex((line) => line.includes(COLLABORATOR_AGENDA_URL));

describe('buildAppointmentMessage (NOTIF-01)', () => {
  it('carries first name, title, dd/MM/yyyy date, HH:MM–HH:MM range and the deep link', () => {
    const message = buildAppointmentMessage(base);

    expect(message).toContain('Maria');
    // Spec: primeiro nome, não o nome completo.
    expect(message).not.toContain('Maria Silva');
    expect(message).toContain('Reunião de alinhamento');
    expect(message).toContain('05/11/2026');
    expect(message).toContain('14:00–16:00');
    expect(message).toContain('https://taskvisiovs.vercel.app/colaborador/agenda');
  });

  it('formats the range exactly as HH:MM–HH:MM', () => {
    expect(formatRange('09:30', '10:15')).toBe('09:30–10:15');
  });
});

describe('observation line (NOTIF-09)', () => {
  it('puts a non-empty observation between the time range and the deep link', () => {
    const lines = linesOf(buildAppointmentMessage({ ...base, notes: 'Levar o contrato' }));

    const range = rangeLine(lines);
    const link = linkLine(lines);
    expect(range).toBeGreaterThan(-1);
    expect(link).toBeGreaterThan(range);
    // Exactly one line sits between them: the observation.
    expect(link - range).toBe(2);
    expect(lines[range + 1]).toContain('Levar o contrato');
    expect(lines[range + 1]).toContain('Observação');
  });

  it('writes no observation line at all for null notes', () => {
    const lines = linesOf(buildAppointmentMessage({ ...base, notes: null }));
    expect(rangeLine(lines)).toBeGreaterThan(-1);
    // The deep link follows the time range directly: nothing in between.
    expect(linkLine(lines) - rangeLine(lines)).toBe(1);
    expect(lines.join('\n')).not.toContain('Observação');
  });

  it('writes no observation line at all for empty or blank notes', () => {
    for (const notes of ['', '   ']) {
      const lines = linesOf(buildAppointmentMessage({ ...base, notes }));
      expect(linkLine(lines) - rangeLine(lines)).toBe(1);
      expect(lines.join('\n')).not.toContain('Observação');
    }
  });
});

describe('cancellation messages (ACK-03, ACK-04)', () => {
  const anyLinkLine = (lines: string[]): number =>
    lines.findIndex((line) => line.includes('taskvisiovs.vercel.app'));

  it('tells the manager who cancelled, with the appointment and the /pj/agenda link', () => {
    const lines = linesOf(buildManagerCancellationMessage({ ...base, notes: null }));

    expect(lines[0]).toContain('Maria cancelou um compromisso');
    // Spec: primeiro nome, não o nome completo.
    expect(lines[0]).not.toContain('Maria Silva');
    expect(lines).toContain('Reunião de alinhamento');
    expect(lines).toContain('05/11/2026 · 14:00–16:00');
    expect(lines[lines.length - 1]).toBe(`Ver a agenda: ${PJ_AGENDA_URL}`);
    // The manager's own agenda, never the collaborator's panel.
    expect(lines.join('\n')).not.toContain(COLLABORATOR_AGENDA_URL);
  });

  it('tells the collaborator their manager cancelled, linking back to their panel', () => {
    const lines = linesOf(buildCollaboratorCancellationMessage({ ...base, notes: null }));

    expect(lines[0]).toContain('Olá Maria,');
    expect(lines[0]).toContain('seu gestor cancelou');
    expect(lines[0]).not.toContain('Maria Silva');
    expect(lines).toContain('05/11/2026 · 14:00–16:00');
    expect(lines[lines.length - 1]).toBe(`Ver sua agenda: ${COLLABORATOR_AGENDA_URL}`);
  });

  it('puts the observation between the range and the link, like the creation notice (NOTIF-09)', () => {
    for (const build of [buildManagerCancellationMessage, buildCollaboratorCancellationMessage]) {
      const lines = linesOf(build({ ...base, notes: 'Levar o contrato' }));
      const range = rangeLine(lines);
      const link = anyLinkLine(lines);

      expect(range).toBeGreaterThan(-1);
      expect(link).toBe(range + 2);
      expect(lines[range + 1]).toContain('Observação: Levar o contrato');
    }
  });

  it('writes no observation line at all for null, empty or blank notes', () => {
    for (const notes of [null, '', '   ']) {
      for (const build of [buildManagerCancellationMessage, buildCollaboratorCancellationMessage]) {
        const lines = linesOf(build({ ...base, notes }));
        expect(anyLinkLine(lines) - rangeLine(lines)).toBe(1);
        expect(lines.join('\n')).not.toContain('Observação');
      }
    }
  });
});

describe('module boundaries (AD-003)', () => {
  it('imports nothing and uses no Deno or client-side API', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');

    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toContain('Deno.');
    expect(source).not.toMatch(/from\s+["'].*\/src\//);
  });
});
