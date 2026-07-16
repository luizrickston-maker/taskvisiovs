import { differenceInCalendarDays, parseISO } from 'date-fns';

export type SlaLevel = 'ok' | 'attention' | 'today' | 'overdue' | 'done' | 'none';

export interface SlaInfo {
  level: SlaLevel;
  label: string;
  daysLeft: number | null;
  color: string; // CSS class (badge color)
  bg: string;    // CSS class (background)
  border: string; // CSS class (left border)
}

/**
 * Calcula o SLA a partir de um prazo.
 * - null/undefined → 'none' (sem chip)
 * - já concluído (status='done') → 'done' (verde)
 * - <0 dias → 'overdue' (vermelho)
 * - 0 dias → 'today' (laranja)
 * - 1–3 dias → 'attention' (amarelo)
 * - >3 dias → 'ok' (verde)
 */
export function computeSla(deadline: string | null | undefined, status?: string | null): SlaInfo {
  if (!deadline) {
    return { level: 'none', label: 'Sem prazo', daysLeft: null, color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-l-muted' };
  }

  if (status === 'done') {
    return { level: 'done', label: 'Concluído', daysLeft: null, color: 'text-status-done', bg: 'bg-status-done/15', border: 'border-l-status-done' };
  }

  const today = new Date();
  const dl = parseISO(deadline);
  const diff = differenceInCalendarDays(dl, today);

  if (diff < 0) {
    const late = Math.abs(diff);
    return {
      level: 'overdue',
      label: `Atrasado ${late}d`,
      daysLeft: diff,
      color: 'text-status-blocked',
      bg: 'bg-status-blocked/15',
      border: 'border-l-status-blocked',
    };
  }

  if (diff === 0) {
    return {
      level: 'today',
      label: 'Vence hoje',
      daysLeft: 0,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-500/15',
      border: 'border-l-orange-500',
    };
  }

  if (diff <= 3) {
    return {
      level: 'attention',
      label: `Vence em ${diff}d`,
      daysLeft: diff,
      color: 'text-status-scheduled',
      bg: 'bg-status-scheduled/15',
      border: 'border-l-status-scheduled',
    };
  }

  return {
    level: 'ok',
    label: `${diff}d restantes`,
    daysLeft: diff,
    color: 'text-status-done',
    bg: 'bg-status-done/15',
    border: 'border-l-status-done',
  };
}