import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClientStructureForm, type ClientOption } from './ClientStructureForm';
import { RETRY_LABEL } from './RunResult';

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('sonner', () => ({ toast }));

const CLIENTS: ClientOption[] = [
  { id: 'cl-1', name: 'Cliente Ativo', isActive: true },
  { id: 'cl-2', name: 'Cliente Inativo', isActive: false },
  { id: 'cl-3', name: 'Outro Ativo', isActive: true },
];

const okResult = {
  status: 'ok' as const,
  created: ['Contratos', 'Vídeos'],
  existing: ['Artes'],
};

function renderForm(overrides: Partial<Parameters<typeof ClientStructureForm>[0]> = {}) {
  const onRun = vi.fn();
  render(
    <ClientStructureForm
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

/** Mesmo caminho de interação usado nos testes existentes do Radix Select. */
async function chooseClient(name: string) {
  const trigger = screen.getByRole('combobox', { name: 'Cliente' });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name }));
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /Criar estrutura|Criando/ }));

beforeEach(() => toast.success.mockReset());

describe('ClientStructureForm — seletor', () => {
  it('lista todos, marcando o inativo em vez de omiti-lo', async () => {
    renderForm();
    const trigger = screen.getByRole('combobox', { name: 'Cliente' });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(trigger);

    expect(await screen.findByRole('option', { name: 'Cliente Ativo' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Outro Ativo' })).toBeInTheDocument();
    // Omitir deixava a lista parecer vazia para quem tem cadastro.
    expect(await screen.findByRole('option', { name: 'Cliente Inativo (inativo)' })).toBeInTheDocument();
  });

  it('dá para escolher um cliente inativo — o flag é anotação, não trava', async () => {
    const onRun = renderForm();
    await chooseClient('Cliente Inativo (inativo)');

    expect(screen.getByRole('button', { name: 'Criar estrutura' })).toBeEnabled();
    submit();
    expect(onRun).toHaveBeenCalledWith('cl-2', 'Cliente Inativo');
  });

  it('sem cliente selecionado o envio fica desabilitado (STRU-05)', () => {
    const onRun = renderForm();
    expect(screen.getByRole('button', { name: 'Criar estrutura' })).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('enviando, o controle de envio fica desabilitado (STRU-05)', async () => {
    // Seleciona primeiro e depois passa a pendência — é o caminho real: o
    // seletor trava junto, então não dá para escolher durante o envio.
    const onRun = vi.fn();
    const view = render(
      <ClientStructureForm
        clients={CLIENTS}
        canManage
        isPending={false}
        result={null}
        message={null}
        onRun={onRun}
      />,
    );
    await chooseClient('Cliente Ativo');

    view.rerender(
      <ClientStructureForm
        clients={CLIENTS}
        canManage
        isPending
        result={null}
        message={null}
        onRun={onRun}
      />,
    );

    const button = screen.getByRole('button', { name: 'Criando...' });
    expect(button).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('com cliente selecionado e parado, envia uma vez', async () => {
    const onRun = renderForm();
    await chooseClient('Cliente Ativo');
    expect(screen.getByRole('button', { name: 'Criar estrutura' })).toBeEnabled();

    submit();
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledWith('cl-1', 'Cliente Ativo');
  });

  it('sem cliente nenhum não deixa enviar', () => {
    const onRun = renderForm({ clients: [] });
    expect(screen.getByRole('button', { name: 'Criar estrutura' })).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });
});

describe('ClientStructureForm — resultado (MENU-03)', () => {
  it('resultado de execução é renderizado pelo RunResult', () => {
    renderForm({ result: okResult });

    expect(screen.getByText('Estrutura pronta')).toBeInTheDocument();
    expect(screen.getByText((_, el) => !!el && el.tagName === 'P' && (el.textContent ?? '').startsWith('Criado:')).textContent).toContain('Contratos');
  });

  it('resultado de falha oferece repetir e repete com o mesmo cliente', async () => {
    const onRun = renderForm({
      result: { status: 'failed', created: [], existing: [], failedAt: 'Contratos', error: 'x' },
    });
    await chooseClient('Cliente Ativo');

    fireEvent.click(screen.getByRole('button', { name: RETRY_LABEL }));
    expect(onRun).toHaveBeenCalledWith('cl-1', 'Cliente Ativo');
  });

  it('mensagem de conflito aparece como alerta, sem tocar em RunResult', () => {
    renderForm({ message: 'Já existe uma criação em andamento para este cliente' });

    expect(
      screen.getByText('Já existe uma criação em andamento para este cliente'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Estrutura pronta')).toBeNull();
  });

  it('nunca emite um toast de sucesso — o resultado fica na tela', async () => {
    renderForm({ result: okResult });
    await chooseClient('Cliente Ativo');
    submit();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('ClientStructureForm — permissão (MENU-03)', () => {
  it('sem canManage o componente inteiro some: nem seletor, nem botão', () => {
    const { container } = render(
      <ClientStructureForm
        clients={CLIENTS}
        canManage={false}
        isPending={false}
        result={okResult}
        message="x"
        onRun={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('ClientStructureForm — prévia de correspondência', () => {
  it('avisa quando o projeto já existe no Frame.io', async () => {
    renderForm({ frameioProjects: [{ id: 'p1', name: 'Cliente Ativo' }] });
    await chooseClient('Cliente Ativo');

    expect(screen.getByTestId('frameio-preview')).toHaveTextContent(
      'já existe no Frame.io — só as pastas serão criadas',
    );
  });

  it('avisa quando o projeto será criado', async () => {
    renderForm({ frameioProjects: [{ id: 'p2', name: 'Outro' }] });
    await chooseClient('Cliente Ativo');

    expect(screen.getByTestId('frameio-preview')).toHaveTextContent(
      'será criado no Frame.io',
    );
  });

  it('sem projeto escolhido não mostra prévia', () => {
    renderForm({ frameioProjects: [{ id: 'p1', name: 'Cliente Ativo' }] });
    expect(screen.queryByTestId('frameio-preview')).toBeNull();
  });
});


describe('ClientStructureForm — nome do projeto digitado', () => {
  it('semeia o nome com o do cliente ao escolher', async () => {
    renderForm();
    await chooseClient('Cliente Ativo');

    expect(screen.getByLabelText('Nome do projeto no Frame.io')).toHaveValue('Cliente Ativo');
  });

  it('manda o nome DIGITADO, não o do cliente', async () => {
    const onRun = renderForm();
    await chooseClient('Cliente Ativo');
    fireEvent.change(screen.getByLabelText('Nome do projeto no Frame.io'), {
      target: { value: 'Nome Que Eu Digitei' },
    });

    submit();
    expect(onRun).toHaveBeenCalledWith('cl-1', 'Nome Que Eu Digitei');
  });

  it('trocar de cliente volta a semear com o nome do novo', async () => {
    renderForm();
    await chooseClient('Cliente Ativo');
    fireEvent.change(screen.getByLabelText('Nome do projeto no Frame.io'), {
      target: { value: 'Editado' },
    });
    await chooseClient('Outro Ativo');

    expect(screen.getByLabelText('Nome do projeto no Frame.io')).toHaveValue('Outro Ativo');
  });

  it('sem nome não envia, mesmo com cliente escolhido', async () => {
    const onRun = renderForm();
    await chooseClient('Cliente Ativo');
    fireEvent.change(screen.getByLabelText('Nome do projeto no Frame.io'), {
      target: { value: '   ' },
    });

    expect(screen.getByRole('button', { name: 'Criar estrutura' })).toBeDisabled();
    submit();
    expect(onRun).not.toHaveBeenCalled();
  });

  it('prévia acompanha o nome digitado, não o do cliente', async () => {
    renderForm({ frameioProjects: [{ id: 'p1', name: 'Existe Esse' }] });
    await chooseClient('Cliente Ativo');
    fireEvent.change(screen.getByLabelText('Nome do projeto no Frame.io'), {
      target: { value: 'Existe Esse' },
    });

    expect(screen.getByTestId('frameio-preview')).toHaveTextContent('já existe no Frame.io');
  });
});
