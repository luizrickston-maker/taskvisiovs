/**
 * notify-appointment: lógica pura (AD-003).
 *
 * Todo I/O chega injetado - env, fetch e o acesso a dados - para que o
 * Vitest exercite envio, falha, timeout, deduplicação e ausência de WhatsApp
 * sem Deno e sem rede. `supabase/functions/notify-appointment/index.ts` só
 * liga isto ao Deno (createClient, Deno.env, Deno.serve).
 *
 * Um só manipulador para três motivos de envio (ACK-02..ACK-05):
 *   - `created`                   -> o colaborador, no número dele;
 *   - `cancelled_by_collaborator` -> os destinatários `agenda` do workspace;
 *   - `cancelled_by_manager`      -> o colaborador, de novo.
 * Edição continua sem notificação nenhuma (NOTIF-07).
 */

import {
  buildAppointmentMessage,
  buildCollaboratorCancellationMessage,
  buildManagerCancellationMessage,
} from './collaborator-agenda.ts';

/** NOTIF-06: 10 segundos e o envio é abortado. */
export const SEND_TIMEOUT_MS = 10_000;

export type NotifyStatus = 'sent' | 'failed' | 'timeout' | 'no_whatsapp';

/** O que motivou o envio. Ausente no corpo = criação, para o cliente antigo. */
export type NotifyKind = 'created' | 'cancelled_by_collaborator' | 'cancelled_by_manager';

export type AppointmentRow = {
  id: string;
  /** ACK-03: o workspace decide quem recebe o aviso de cancelamento. */
  workspace_id: string;
  member_user_id: string;
  title: string;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  notify_status: string;
};

export type CollaboratorRow = {
  name: string;
  whatsapp: string | null;
};

/** Porta de dados: implementada com supabase-js no index.ts, com fakes nos testes. */
export type NotifyStore = {
  getAppointment(appointmentId: string): Promise<AppointmentRow | null>;
  getCollaborator(memberUserId: string): Promise<CollaboratorRow | null>;
  /** ACK-03: destinatários ativos do tipo `agenda`, números já normalizados. */
  getAgendaRecipients(workspaceId: string): Promise<string[]>;
  /** ACK-03: `workspaces.notify_whatsapp`, o número legado de reserva. */
  getWorkspaceNotifyWhatsapp(workspaceId: string): Promise<string | null>;
  nextAttempt(appointmentId: string): Promise<number>;
  /** false = outra invocação já tomou esta tentativa: não enviar nada (NOTIF-04). */
  claimAttempt(appointmentId: string, attempt: number): Promise<boolean>;
  recordAttempt(
    appointmentId: string,
    attempt: number,
    status: NotifyStatus,
    providerResponse: string | null
  ): Promise<void>;
  setNotifyStatus(appointmentId: string, status: NotifyStatus): Promise<void>;
};

export type FetchResponseLike = {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
};

export type FetchInitLike = {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
};

export type NotifyDeps = {
  /** Somente daqui saem URL e token de provedor (NOTIF-05). */
  env(name: string): string | undefined;
  fetchImpl(url: string, init: FetchInitLike): Promise<FetchResponseLike>;
  store: NotifyStore;
  timeoutMs?: number;
};

export type NotifyResult = {
  status: number;
  body: Record<string, unknown>;
};

const DIGITS_ONLY = /^\d+$/;

function deliverResult(
  status: NotifyStatus,
  providerResponse: string | null
): { status: NotifyStatus; providerResponse: string | null } {
  return { status, providerResponse };
}

async function sendToNumber(
  whatsapp: string,
  message: string,
  deps: NotifyDeps
): Promise<{ status: NotifyStatus; providerResponse: string | null }> {
  const url = deps.env('AGZAP_URL');
  const token = deps.env('AGZAP_TOKEN');
  if (!url || !token) {
    return deliverResult('failed', 'AGZAP_URL/AGZAP_TOKEN não configurados');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? SEND_TIMEOUT_MS);
  try {
    const response = await deps.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, number: whatsapp, type: 'text', message }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      return deliverResult(
        'failed',
        `agzap_${response.status}: ${detail || response.statusText}`.slice(0, 300)
      );
    }
    return deliverResult('sent', null);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    if (timedOut) return deliverResult('timeout', null);
    return deliverResult('failed', error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Um envio por número. `sent` só quando todos receberam - um destinatário
 * perdido é `failed`, para o registro da tentativa não esconder o buraco
 * (ACK-05).
 */
async function deliverToNumbers(
  numbers: string[],
  message: string,
  deps: NotifyDeps
): Promise<{ status: NotifyStatus; providerResponse: string | null }> {
  if (numbers.length === 0) {
    return deliverResult('no_whatsapp', null);
  }

  const outcomes: Array<{ status: NotifyStatus; providerResponse: string | null }> = [];
  for (const number of numbers) {
    outcomes.push(await sendToNumber(number, message, deps));
  }

  // Um destinatário: o veredito é o dele, sem tradução (um timeout é timeout).
  if (outcomes.length === 1) return outcomes[0];

  const failures = outcomes.filter((outcome) => outcome.status !== 'sent');
  if (failures.length === 0) return deliverResult('sent', null);

  const detail = failures
    .map((outcome) => outcome.providerResponse ?? outcome.status)
    .join('; ')
    .slice(0, 300);
  const status = failures.every((outcome) => outcome.status === 'timeout')
    ? 'timeout'
    : 'failed';
  return deliverResult(status, failures.some((outcome) => outcome.providerResponse) ? detail : null);
}

function validNumbers(numbers: Array<string | null>): string[] {
  return numbers.filter((number): number is string => !!number && DIGITS_ONLY.test(number));
}

async function deliver(
  appointment: AppointmentRow,
  kind: NotifyKind,
  deps: NotifyDeps
): Promise<{ status: NotifyStatus; providerResponse: string | null }> {
  const collaborator = await deps.store.getCollaborator(appointment.member_user_id);
  const detail = {
    collaboratorName: collaborator?.name ?? '',
    title: appointment.title,
    date: appointment.date,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
    notes: appointment.notes,
  };

  if (kind === 'cancelled_by_collaborator') {
    // ACK-03: o cancelamento sai da agenda de quem criou. Destinatários ativos
    // do tipo `agenda`, com `workspaces.notify_whatsapp` como reserva - a mesma
    // regra de resolução do process-agenda-reminders, sem número fixo em código.
    const recipients = await deps.store.getAgendaRecipients(appointment.workspace_id);
    const numbers =
      recipients.length > 0
        ? recipients
        : [await deps.store.getWorkspaceNotifyWhatsapp(appointment.workspace_id)];
    return deliverToNumbers(
      validNumbers(numbers),
      buildManagerCancellationMessage(detail),
      deps
    );
  }

  // Criação (NOTIF-01) e cancelamento pelo gestor (ACK-04) falam com o
  // colaborador, no mesmo canal.
  const whatsapp = collaborator?.whatsapp ?? null;
  if (!whatsapp || !DIGITS_ONLY.test(whatsapp)) {
    // MGR-07: sem número, ou com um valor que não são só dígitos, não se liga
    // a agzap - a tentativa fica registrada como no_whatsapp.
    return deliverResult('no_whatsapp', null);
  }
  const message =
    kind === 'cancelled_by_manager'
      ? buildCollaboratorCancellationMessage(detail)
      : buildAppointmentMessage(detail);
  return deliverToNumbers([whatsapp], message, deps);
}

/**
 * Envia a notificação de um compromisso e registra a tentativa.
 *
 * O compromisso nunca é alterado aqui além de `notify_status` na criação:
 * falha de envio não pode desfazer nem o agendamento do gestor (NOTIF-02) nem
 * a cancelação de ninguém (ACK-05). Edição não tem motivo nenhum de envio
 * (NOTIF-07).
 */
export async function handleNotifyAppointment(
  appointmentId: string,
  deps: NotifyDeps,
  kind: NotifyKind = 'created'
): Promise<NotifyResult> {
  const appointment = await deps.store.getAppointment(appointmentId);
  if (!appointment) {
    return { status: 404, body: { error: 'appointment not found' } };
  }

  const attempt = await deps.store.nextAttempt(appointmentId);
  const claimed = await deps.store.claimAttempt(appointmentId, attempt);
  if (!claimed) {
    // UNIQUE(appointment_id, attempt): outra invocação já é dona desta tentativa.
    return { status: 200, body: { skipped: 'attempt already claimed', attempt } };
  }

  const outcome = await deliver(appointment, kind, deps);
  await deps.store.recordAttempt(appointmentId, attempt, outcome.status, outcome.providerResponse);
  // `notify_status` pertence ao aviso de criação: um cancelamento não reescreve
  // o veredito que o gestor ainda pode resgatar com "Reenviar".
  if (kind === 'created') {
    await deps.store.setNotifyStatus(appointmentId, outcome.status);
  }

  return {
    status: 200,
    body: { appointment_id: appointmentId, attempt, kind, notify_status: outcome.status },
  };
}
