import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { APPOINTMENT_QUERY_KEY } from '@/hooks/useCollaboratorAppointments';
import type { CollaboratorAppointmentRow } from './CalendarEvent';

// =====================================================
// Delivery of the WhatsApp notification the manager triggers by creating an
// appointment (NOTIF-01) and the manager's view of how it went (NOTIF-02,
// NOTIF-03, NOTIF-08).
//
// The client never builds the message and never holds the provider URL or
// token (NOTIF-05): it only names an appointment and the edge function reads
// the row, decides and logs the attempt. A resend is the same call again — the
// attempt number is the server's to allocate, so this component cannot touch
// a previous attempt (NOTIF-03).
// =====================================================

/** The edge function, invoked with `{ appointment_id }` and nothing else. */
export const NOTIFY_FUNCTION = 'notify-appointment';

/** MGR-07 — the exact sentence the spec names. */
export const NO_WHATSAPP_MESSAGE =
  'Colaborador sem WhatsApp cadastrado — notificação não enviada.';

/** The verdicts a resend can rescue. `sent` needs no further action. */
const RETRYABLE = new Set(['failed', 'timeout', 'no_whatsapp']);

interface AppointmentNotifierProps {
  /** The freshly created appointment, or nothing while the manager is on their own calendar. */
  appointment: CollaboratorAppointmentRow | null;
}

export function AppointmentNotifier({ appointment }: AppointmentNotifierProps) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>(appointment?.notify_status ?? 'pending');
  const [sending, setSending] = useState(false);
  /** One auto-invocation per appointment, however often React re-renders. */
  const invokedFor = useRef<string | null>(null);

  const run = useCallback(
    async (row: CollaboratorAppointmentRow) => {
      setSending(true);
      try {
        const { data, error } = await supabase.functions.invoke(NOTIFY_FUNCTION, {
          body: { appointment_id: row.id },
        });
        const verdict = (data as { notify_status?: unknown } | null)?.notify_status;
        if (typeof verdict === 'string') {
          // NOTIF-08: the row's `notify_status` column is the durable copy of
          // the latest attempt, and the edge function has already written it.
          setStatus(verdict);
        } else if (error) {
          setStatus('failed');
        }
        void qc.invalidateQueries({ queryKey: [APPOINTMENT_QUERY_KEY] });
      } catch {
        setStatus('failed');
      } finally {
        setSending(false);
      }
    },
    [qc],
  );

  useEffect(() => {
    if (!appointment) {
      invokedFor.current = null;
      return;
    }
    // Anything but `pending` has already been attempted; never re-send it.
    if (appointment.notify_status !== 'pending') {
      setStatus(appointment.notify_status);
      return;
    }
    if (invokedFor.current === appointment.id) return;
    invokedFor.current = appointment.id;
    void run(appointment);
  }, [appointment, run]);

  if (!appointment) return null;

  const needsResend = RETRYABLE.has(status);

  return (
    <div
      data-testid="appointment-notifier"
      data-status={status}
      className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl border border-border/50 bg-muted/30"
    >
      <p className="text-sm min-w-0">
        {status === 'no_whatsapp'
          ? NO_WHATSAPP_MESSAGE
          : status === 'sent'
            ? 'Notificação enviada.'
            : needsResend
              ? 'Notificação não enviada.'
              : 'Enviando notificação…'}
      </p>

      {needsResend && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-xs shrink-0"
          onClick={() => void run(appointment)}
          disabled={sending}
        >
          <Send className="w-3.5 h-3.5" /> Reenviar
        </Button>
      )}
    </div>
  );
}
