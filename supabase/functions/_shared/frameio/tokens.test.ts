import { describe, expect, it } from 'vitest';
import { classifyTokenError, needsRefresh, workspaceStillPresent } from './tokens';

const at = (iso: string) => new Date(iso);

describe('needsRefresh (AUTH-08)', () => {
  const now = at('2026-11-18T12:00:00.000Z');

  it('renova quando faltam menos de 5 minutos', () => {
    expect(needsRefresh(at('2026-11-18T12:04:59.000Z'), undefined, now)).toBe(true);
  });

  it('renova exatamente na borda dos 5 minutos', () => {
    expect(needsRefresh(at('2026-11-18T12:05:00.000Z'), undefined, now)).toBe(true);
  });

  it('não renova quando ainda sobra tempo de folga', () => {
    expect(needsRefresh(at('2026-11-18T12:30:00.000Z'), undefined, now)).toBe(false);
    expect(needsRefresh(at('2026-11-18T13:00:00.000Z'), undefined, now)).toBe(false);
  });

  it('renova um token que já venceu', () => {
    expect(needsRefresh(at('2026-11-18T11:59:00.000Z'), undefined, now)).toBe(true);
  });

  it('aceita uma folga própria', () => {
    expect(needsRefresh(at('2026-11-18T12:20:00.000Z'), 30 * 60_000, now)).toBe(true);
    expect(needsRefresh(at('2026-11-18T12:20:00.000Z'), 10 * 60_000, now)).toBe(false);
  });

  it('depende do `now` recebido, não do relógio de parede', () => {
    const past = at('2020-01-01T00:00:00.000Z');
    // Se usasse o relógio real, qualquer token de 2026 pareceria vencido.
    expect(needsRefresh(at('2026-11-18T23:59:00.000Z'), undefined, past)).toBe(false);
  });
});

describe('classifyTokenError (AUTH-09, EDGE-05)', () => {
  it('recusa do refresh vira reconexão, mesmo em 400', () => {
    expect(classifyTokenError(400, { error: 'invalid_grant' })).toBe('reconnect');
  });

  it('401 vira reconexão: o token não é mais aceito', () => {
    expect(classifyTokenError(401, { error: 'unauthorized' })).toBe('reconnect');
    expect(classifyTokenError(401, undefined)).toBe('reconnect');
  });

  it('429, 5xx e falha de rede são transitórios', () => {
    expect(classifyTokenError(429, undefined)).toBe('retryable');
    expect(classifyTokenError(500, undefined)).toBe('retryable');
    expect(classifyTokenError(503, { error: 'unavailable' })).toBe('retryable');
    expect(classifyTokenError(0, undefined)).toBe('retryable');
  });

  it('recusa definitiva não é transitória nem reconexão', () => {
    expect(classifyTokenError(400, { error: 'invalid_request' })).toBe('fatal');
    expect(classifyTokenError(403, undefined)).toBe('fatal');
    expect(classifyTokenError(404, undefined)).toBe('fatal');
    expect(classifyTokenError(422, { error: 'unprocessable' })).toBe('fatal');
  });

  it('ignora corpo que não é objeto em vez de explodir', () => {
    expect(classifyTokenError(500, 'oops')).toBe('retryable');
    expect(classifyTokenError(400, null)).toBe('fatal');
  });
});

describe('workspaceStillPresent (EDGE-05)', () => {
  it('mantém a conexão quando o workspace gravado ainda está na conta', () => {
    expect(
      workspaceStillPresent([{ id: 'ws-1' }, { id: 'ws-2' }], 'ws-2'),
    ).toBe(true);
  });

  it('exige reconexão quando o workspace sumiu da conta', () => {
    expect(workspaceStillPresent([{ id: 'ws-1' }], 'ws-2')).toBe(false);
    expect(workspaceStillPresent([], 'ws-2')).toBe(false);
  });
});
