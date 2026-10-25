import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NOTIFY_FUNCTION,
  sendCancellationNotice,
  type CancellationNotice,
} from '@/hooks/useCollaboratorAppointments';

// =====================================================
// ACK-06…ACK-08 — what the party that cancelled is told about the WhatsApp
// notice of that cancellation.
//
// It follows the `AppointmentNotifier` pattern (the client names the
// appointment, the edge function decides and logs, a resend is the same call
// again) but is a sibling, not a reuse: `AppointmentNotifier` takes a row and
// auto-invokes when its `notify_status` is `pending`, while a cancelled row is
// dropped from every read path (COLAB-14, MGR-13) and `notify_status` keeps
// the creation verdict by design (ACK-05) — so there is no row to pass and no
// second send to start. The copy and the action label are the spec's here;
// those of `AppointmentNotifier` belong to the creation notice (MGR-07,
// NOTIF-02).
// =====================================================

/** ACK-06 — the exact sentence the spec pins for a delivered cancellation. */
export const CANCELLED_NOTICE = 'Compromisso cancelado.';

/** ACK-07 — the exact sentence the spec pins when it did not go out. */
export const CANCEL_FAILED_NOTICE = 'Compromisso cancelado, mas o aviso não foi enviado.';

/** ACK-07 — the exact label the spec pins for the retry action. */
export const RETRY_NOTICE_LABEL = 'Tentar novamente';

interface CancellationNotifierProps {
  /** What the cancel mutation recorded, or nothing while nothing was cancelled. */
  notice: CancellationNotice | null;
}

export function CancellationNotifier({ notice }: CancellationNotifierProps) {
  const [status, setStatus] = useState(notice?.status ?? null);
  const [resending, setResending] = useState(false);

  // A new cancellation brings its own verdict; nothing else may overwrite it.
  useEffect(() => {
    setStatus(notice?.status ?? null);
  }, [notice]);

  async function retry() {
    if (!notice) return;
    setResending(true);
    try {
      // ACK-08: the same appointment and the same act go out again. The attempt
      // number stays the server's to allocate (NOTIF-03).
      setStatus(await sendCancellationNotice(notice.appointmentId, notice.kind));
    } finally {
      setResending(false);
    }
  }

  if (!notice) return null;

  const delivered = status === 'sent';

  return (
    <div
      data-testid="cancellation-notifier"
      data-status={status ?? 'pending'}
      className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl border border-border/50 bg-muted/30"
    >
      <p className="text-sm min-w-0">
        {delivered ? CANCELLED_NOTICE : CANCEL_FAILED_NOTICE}
      </p>

      {!delivered && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8 text-xs shrink-0"
          onClick={() => void retry()}
          disabled={resending}
        >
          <Send className="w-3.5 h-3.5" /> {RETRY_NOTICE_LABEL}
        </Button>
      )}
    </div>
  );
}
