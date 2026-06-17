import React, { useEffect } from "react";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useRealtimeQueryInvalidation } from "@/hooks/useRealtimeQueryInvalidation";
import { RealtimeProvider } from "@/contexts/RealtimeContext";

export function RealtimeBootstrap({
  userId,
  children,
  disabled = false,
}: {
  userId: string | undefined;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  // Boot trace em DEV
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[RealtimeBootstrap] Config', {
        userId: userId ? userId.slice(0, 8) + '...' : null,
        disabled,
      });
    }
  }, [userId, disabled]);

  // Só ativa realtime se não estiver desabilitado
  useRealtimeSync(disabled ? undefined : userId);
  // Sincroniza em tempo real as telas baseadas em React Query (Caixa PJ,
  // Briefings, Processos, Clientes/Portal, etc.)
  useRealtimeQueryInvalidation(disabled ? undefined : userId);
  const status = useRealtimeStatus(disabled ? undefined : userId);

  if (disabled && import.meta.env.DEV) {
    console.log('[RealtimeBootstrap] Realtime desabilitado (safe mode)');
  }

  return <RealtimeProvider status={status}>{children}</RealtimeProvider>;
}
