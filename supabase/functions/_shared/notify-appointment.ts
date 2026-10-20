/**
 * notify-appointment: lógica pura (AD-003).
 *
 * Todo I/O chega injetado - env, fetch e o acesso a dados - para que o
 * Vitest exercite envio, falha, timeout, deduplicação e ausência de WhatsApp
 * sem Deno e sem rede. `supabase/functions/notify-appointment/index.ts` só
 * liga isto ao Deno (createClient, Deno.env, Deno.serve).
 */

import { buildAppointmentMessage } from './collaborator-agenda.ts';

/** NOTIF-06: 10 segundos e o envio é abortado. */
export const SEND_TIMEOUT_MS = 10_000;

export type NotifyStatus = 'sent' | 'failed' | 'timeout' | 'no_whatsapp';

export type AppointmentRow = {
  id: string;
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

async function deliver(
  appointment: AppointmentRow,
  deps: NotifyDeps
): Promise<{ status: NotifyStatus; providerResponse: string | null }> {
  const collaborator = await deps.store.getCollaborator(appointment.member_user_id);
  const whatsapp = collaborator?.whatsapp ?? null;

  // MGR-07: sem número, ou com um valor que não são só dígitos, não se liga a
  // agzap - a tentativa fica registrada como no_whatsapp.
  if (!whatsapp || !DIGITS_ONLY.test(whatsapp)) {
    return deliverResult('no_whatsapp', null);
  }

  const url = deps.env('AGZAP_URL');
  const token = deps.env('AGZAP_TOKEN');
  if (!url || !token) {
    return deliverResult('failed', 'AGZAP_URL/AGZAP_TOKEN não configurados');
  }

  const message = buildAppointmentMessage({
    collaboratorName: collaborator?.name ?? '',
    title: appointment.title,
    date: appointment.date,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
    notes: appointment.notes,
  });

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
 * Envia a notificação de um compromisso.
 *
 * O compromisso nunca é alterado aqui além de `notify_status`: falha de envio
 * não pode desfazer o agendamento do gestor (NOTIF-02), e nenhum caminho
 * trata edição ou cancelamento - notificação nasce só na criação (NOTIF-07).
 */
export async function handleNotifyAppointment(
  appointmentId: string,
  deps: NotifyDeps
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

  const outcome = await deliver(appointment, deps);
  await deps.store.recordAttempt(appointmentId, attempt, outcome.status, outcome.providerResponse);
  await deps.store.setNotifyStatus(appointmentId, outcome.status);

  return {
    status: 200,
    body: { appointment_id: appointmentId, attempt, notify_status: outcome.status },
  };
}
