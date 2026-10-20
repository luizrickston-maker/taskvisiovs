import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamMemberForm, WHATSAPP_DIGITS_ERROR } from './TeamMemberForm';

// Spec Edge Case: "IF corporate_team.whatsapp contains a value that is not
// digits-only, THEN the system SHALL reject it at entry with
// `Informe o WhatsApp com DDI, DDD e número, apenas dígitos.`"
// The number is where the collaborator's WhatsApp notification goes, so a
// value that never reaches the provider is a silent failure — it is refused
// here rather than stripped down to something else.

function renderForm(onSave = vi.fn()) {
  render(<TeamMemberForm open onOpenChange={() => {}} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria Silva' } });
  fireEvent.change(screen.getByLabelText('Função'), { target: { value: 'Colaborador' } });
  fireEvent.change(screen.getByLabelText(/Custo/), { target: { value: '1000' } });
  return onSave;
}

describe('TeamMemberForm — whatsapp digits-only rule (Edge Cases)', () => {
  it('rejects a whatsapp that is not digits-only with the spec message', async () => {
    const onSave = renderForm();

    fireEvent.change(screen.getByLabelText('WhatsApp (para notificações)'), {
      target: { value: '+55 11 99999-0001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByText(WHATSAPP_DIGITS_ERROR)).toBeInTheDocument());
    expect(WHATSAPP_DIGITS_ERROR).toBe(
      'Informe o WhatsApp com DDI, DDD e número, apenas dígitos.',
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends a digits-only whatsapp through untouched', async () => {
    const onSave = renderForm();

    fireEvent.change(screen.getByLabelText('WhatsApp (para notificações)'), {
      target: { value: '5511999990001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(WHATSAPP_DIGITS_ERROR)).not.toBeInTheDocument();
    expect(onSave.mock.calls[0][0]).toMatchObject({ whatsapp: '5511999990001' });
  });
});
