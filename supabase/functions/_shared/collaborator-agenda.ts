/**
 * Mensagem do compromisso da agenda do colaborador.
 *
 * AD-003: módulo puro, sem importações e sem APIs do Deno, para que o Vitest
 * teste exatamente o mesmo arquivo que a função de borda importa - o Deno não
 * está instalado nesta máquina.
 */

/** Deep link do painel do colaborador (NOTIF-01). */
export const COLLABORATOR_AGENDA_URL = "https://taskvisiovs.vercel.app/colaborador/agenda";

export type AppointmentMessageInput = {
  /** Nome completo em corporate_team.name; só o primeiro nome é usado. */
  collaboratorName: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  startTime: string;
  /** HH:MM */
  endTime: string;
  /** Observação do gestor; nula ou vazia não gera linha nenhuma (NOTIF-09). */
  notes?: string | null;
};

/** YYYY-MM-DD -> dd/MM/yyyy, sem depender de fuso (o valor já é data pura). */
export function formatDateBR(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** HH:MM–HH:MM com travessão, como o spec escreve o intervalo. */
export function formatRange(start: string, end: string): string {
  return `${start}–${end}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * Corpo da mensagem: nome de quem recebe, título, data dd/MM/yyyy, intervalo
 * HH:MM–HH:MM, observação (quando existe) e o deep link - nessa ordem.
 */
export function buildAppointmentMessage(input: AppointmentMessageInput): string {
  const lines: string[] = [
    `Olá ${firstName(input.collaboratorName)}, seu gestor marcou um compromisso na sua agenda.`,
    "",
    input.title,
    `${formatDateBR(input.date)} · ${formatRange(input.startTime, input.endTime)}`,
  ];

  const notes = input.notes?.trim();
  if (notes) {
    lines.push(`Observação: ${notes}`);
  }

  lines.push(`Confirme ou cancele no seu painel: ${COLLABORATOR_AGENDA_URL}`);
  return lines.join("\n");
}
