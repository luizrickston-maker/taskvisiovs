import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ALREADY_EXISTED,
  NOTHING_CREATED,
  PARTIAL_CREATED,
  RETRY_LABEL,
  RunResult,
  type FrameioRunResult,
} from './RunResult';
import type { RunResult as ServerRunResult } from '../../../supabase/functions/_shared/frameio/runner';

// ── Contrato de tipo (capturado pelo gate `npx tsc --noEmit`) ────────────────
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const _contract: Equals<FrameioRunResult, ServerRunResult> = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _contractRuntime = _contract;

const ok: FrameioRunResult = {
  status: 'ok',
  created: ['Contratos', 'Vídeos'],
  existing: ['Artes'],
};
const allExisting: FrameioRunResult = { status: 'ok', created: [], existing: ['Contratos'] };

/**
 * `getByText` casa o nó de texto direto, então `/Criado:/` encontra só o
 * `<span>` do rótulo e não a lista que vem depois. Seleciona o parágrafo.
 */
const line = (label: string) =>
  screen.getByText(
    (_content, el) =>
      !!el && el.tagName === 'P' && (el.textContent ?? '').trim().startsWith(label),
  );

describe('RunResult — sucesso (STRU-07, PROJ-12)', () => {
  it('lista o que foi criado e o que já existia, diferenciados', () => {
    render(<RunResult result={ok} onRetry={vi.fn()} />);

    expect(line('Criado:').textContent).toContain('Contratos');
    expect(line('Criado:').textContent).toContain('Vídeos');
    expect(line(`${ALREADY_EXISTED}:`).textContent).toContain('Artes');
    expect(screen.getByText('Estrutura pronta')).toBeInTheDocument();
  });

  it('nada criado: diz que tudo já existia em vez de celebrar', () => {
    render(<RunResult result={allExisting} onRetry={vi.fn()} />);

    expect(
      screen.getByText('Tudo o que era necessário já existia.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Estrutura criada no Frame.io.')).toBeNull();
    expect(line(`${ALREADY_EXISTED}:`).textContent).toContain('Contratos');
  });

  it('sem lista vazia imprime nada', () => {
    render(<RunResult result={{ status: 'ok', created: [], existing: [] }} onRetry={vi.fn()} />);

    expect(screen.queryByText((_, el) => !!el && el.tagName === 'P' && (el.textContent ?? '').startsWith('Criado:'))).toBeNull();
    expect(screen.queryByText((_, el) => !!el && el.tagName === 'P' && (el.textContent ?? '').startsWith(ALREADY_EXISTED))).toBeNull();
  });
});

describe('RunResult — falha honesta (FAIL-01, PART-01, PART-02, EDGE-02)', () => {
  const partial: FrameioRunResult = {
    status: 'failed',
    created: ['Contratos'],
    existing: [],
    failedAt: 'Artes',
    remaining: ['Artes', 'Vídeos'],
    error: 'Frame.io 503: indisponível',
  };

  it('mostra o que foi criado E o que não foi (PART-01)', () => {
    render(<RunResult result={partial} onRetry={vi.fn()} />);

    expect(line('Criado:').textContent).toContain('Contratos');
    expect(line('Não criado:').textContent).toContain('Artes');
    expect(line('Não criado:').textContent).toContain('Vídeos');
    expect(screen.getByText(PARTIAL_CREATED)).toBeInTheDocument();
  });

  it('nomeia a etapa que falhou (FAIL-01)', () => {
    render(<RunResult result={partial} onRetry={vi.fn()} />);

    expect(screen.getByText('Falhou em')).toBeInTheDocument();
    expect(screen.getByText('Artes')).toBeInTheDocument();
  });

  it('primeiro item falhando: diz que nada foi criado e oferece repetir (PART-02)', () => {
    const onRetry = vi.fn();
    render(
      <RunResult
        result={{
          status: 'failed',
          created: [],
          existing: [],
          failedAt: 'Contratos',
          remaining: ['Contratos', 'Artes'],
          error: 'Frame.io 500',
        }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(NOTHING_CREATED)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: RETRY_LABEL });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('toda falha tem Tentar novamente, mesmo sem falhaAt (FAIL-01)', () => {
    const onRetry = vi.fn();
    render(<RunResult result={{ status: 'failed', created: [], existing: [] }} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('devolve a razão original sem engolir (EDGE-02)', () => {
    render(<RunResult result={partial} onRetry={vi.fn()} />);

    expect(screen.getByText('Frame.io 503: indisponível')).toBeInTheDocument();
  });

  it('status failed nunca cai no estado de sucesso', () => {
    render(<RunResult result={partial} onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Estrutura pronta/)).toBeNull();
    expect(screen.queryByText(/Estrutura criada no Frame\.io/)).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('sucesso nunca mostra o botão de repetir', () => {
    render(<RunResult result={ok} onRetry={vi.fn()} />);

    expect(screen.queryByRole('button', { name: RETRY_LABEL })).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
