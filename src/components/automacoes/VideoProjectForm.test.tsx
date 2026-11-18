import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  DEFAULT_TIPO,
  SUBMIT_VIDEO_LABEL,
  VideoProjectForm,
  buildMonthFolderName,
  buildProjectFolderName,
  type VideoRunInput,
} from './VideoProjectForm';
import { RETRY_LABEL } from './RunResult';
import type { ClientOption } from './ClientStructureForm';
// O canon é o do servidor: é ele que grava a pasta de verdade.
import {
  buildMonthFolderName as serverMonth,
  buildProjectFolderName as serverProject,
} from '../../../supabase/functions/_shared/frameio/names';

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sonner', () => ({ toast }));

const CLIENTS: ClientOption[] = [
  { id: 'cl-1', name: 'Cliente Xyz', isActive: true },
  { id: 'cl-2', name: 'Inativo', isActive: false },
];

function renderForm(overrides: Partial<Parameters<typeof VideoProjectForm>[0]> = {}) {
  const onRun = vi.fn();
  render(
    <VideoProjectForm
      clients={CLIENTS}
      canManage
      isPending={false}
      result={null}
      message={null}
      onRun={onRun}
      {...overrides}
    />,
  );
  return onRun;
}

function chooseClient() {
  const trigger = screen.getByRole('combobox', { name: 'Cliente' });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('option', { name: 'Cliente Xyz' }));
}

function fillAll({ date = '2026-11-05', tipo = 'Video', nome = 'Lancamento' } = {}) {
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: date } });
  fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: tipo } });
  fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: nome } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /Criar projeto de vídeo|Criando/ }));

beforeEach(() => toast.success.mockReset());

describe('buildProjectFolderName — contract com o servidor (PROJ-07, PROJ-08, PROJ-09)', () => {
  // 2026-11-01 é domingo; os sete dias seguidos cobrem a semana inteira.
  const WEEK = ['01', '02', '03', '04', '05', '06', '07'].map((d) => `2026-11-${d}`);
  const MONTHS = [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
  ].map((m) => `2026-${m}-15`);

  it.each([...WEEK, ...MONTHS])(
    'cliente e servidor concordam em %s',
    (dateISO) => {
      const input = { dateISO, tipo: 'Video', nomeProjeto: 'Lancamento' };
      expect(buildProjectFolderName(input)).toBe(serverProject(input));
      expect(buildMonthFolderName(dateISO)).toBe(serverMonth(dateISO));
    },
  );

  it('concilia acentos e espaços do mesmo jeito', () => {
    const input = {
      dateISO: '2026-04-03',
      tipo: 'Vídeo Institucional',
      nomeProjeto: 'Lançamento êntrada',
    };
    expect(buildProjectFolderName(input)).toBe(serverProject(input));
    expect(buildProjectFolderName(input)).toBe(
      '2026-04-03_Sexta-Vídeo-Institucional-Lançamento-êntrada',
    );
  });

  it('separadores saem exatamente como o spec manda', () => {
    expect(buildProjectFolderName({ dateISO: '2026-11-05', tipo: 'Video', nomeProjeto: 'Lancamento' })).toBe(
      '2026-11-05_Quinta-Video-Lancamento',
    );
    expect(buildMonthFolderName('2026-11-05')).toBe('2026-11-Novembro');
  });

  it('sóbado e domingo não ganham hífen pela tradução', () => {
    expect(buildProjectFolderName({ dateISO: '2026-11-07', tipo: 'Video', nomeProjeto: 'X' })).toContain('_Sábado-');
    expect(buildProjectFolderName({ dateISO: '2026-11-01', tipo: 'Video', nomeProjeto: 'X' })).toContain('_Domingo-');
  });
});

describe('VideoProjectForm — prévia', () => {
  it('mostra a pasta do projeto que será criada', () => {
    renderForm();
    chooseClient();
    fillAll();

    expect(screen.getByText('2026-11-05_Quinta-Video-Lancamento')).toBeInTheDocument();
    expect(screen.getByText('2026-11-Novembro')).toBeInTheDocument();
  });

  it('prévia muda em tempo real quando o nome muda', () => {
    renderForm();
    chooseClient();
    fillAll();
    fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: 'Outro Nome' } });

    expect(screen.getByText('2026-11-05_Quinta-Video-Outro-Nome')).toBeInTheDocument();
  });

  it('sem data não há prévia nem envio', () => {
    const onRun = renderForm();
    chooseClient();
    fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: 'X' } });

    expect(screen.queryByText(/Pasta do projeto:/)).toBeNull();
    expect(screen.getByRole('button', { name: SUBMIT_VIDEO_LABEL })).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });
});

describe('VideoProjectForm — envio (PROJ-11)', () => {
  it('envia os quatro campos quando tudo está preenchido', () => {
    const onRun = renderForm();
    chooseClient();
    fillAll();
    expect(screen.getByRole('button', { name: SUBMIT_VIDEO_LABEL })).toBeEnabled();

    submit();
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledWith({
      clientId: 'cl-1',
      dateISO: '2026-11-05',
      tipo: 'Video',
      nomeProjeto: 'Lancamento',
    } satisfies VideoRunInput);
  });

  it('com campo obrigatório vazio o envio fica desabilitado', () => {
    const onRun = renderForm();
    chooseClient();
    fillAll({ nome: '' });

    expect(screen.getByRole('button', { name: SUBMIT_VIDEO_LABEL })).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('durante o envio o controle fica desabilitado (PROJ-11)', () => {
    const onRun = renderForm({ isPending: true });
    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('começa com Tipo preenchido, não em branco', () => {
    renderForm();
    expect(screen.getByLabelText('Tipo')).toHaveValue(DEFAULT_TIPO);
  });
});

describe('VideoProjectForm — recusas (PROJ-10)', () => {
  it('mostra a mensagem de projeto inexistente e nada de sucesso', () => {
    renderForm({ message: 'Crie primeiro a estrutura do cliente' });

    expect(screen.getByRole('alert')).toHaveTextContent('Crie primeiro a estrutura do cliente');
    expect(screen.queryByText('Estrutura pronta')).toBeNull();
    expect(screen.queryByText(/Estrutura criada no Frame\.io/)).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('resultado de falha oferece repetir com os mesmos campos', () => {
    const onRun = renderForm({
      result: { status: 'failed', created: [], existing: [], failedAt: 'Vídeos', error: 'x' },
    });
    chooseClient();
    fillAll();

    fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));
    expect(onRun).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'cl-1', nomeProjeto: 'Lancamento' }),
    );
  });
});

describe('VideoProjectForm — permissão (MENU-03)', () => {
  it('sem canManage o componente inteiro some', () => {
    const { container } = render(
      <VideoProjectForm
        clients={CLIENTS}
        canManage={false}
        isPending={false}
        result={null}
        message={null}
        onRun={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('VideoProjectForm — prévia de correspondência', () => {
  it('projeto existente: diz que as pastas entram nele', async () => {
    renderForm({ frameioProjects: [{ id: 'p1', name: 'Cliente Xyz' }] });
    chooseClient();
    fillAll();

    expect(screen.getByTestId('frameio-preview')).toHaveTextContent(
      'Projeto já existe no Frame.io',
    );
  });

  it('projeto ausente: manda rodar Cliente novo antes, porque o fluxo falharia (PROJ-10)', async () => {
    renderForm({ frameioProjects: [{ id: 'p2', name: 'Outro' }] });
    chooseClient();
    fillAll();

    expect(screen.getByTestId('frameio-preview')).toHaveTextContent(
      'ainda não existe no Frame.io',
    );
    expect(screen.getByTestId('frameio-preview')).toHaveTextContent('Cliente novo');
  });
});
