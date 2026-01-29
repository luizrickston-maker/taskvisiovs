import React, { createContext, useContext } from "react";
import type { RealtimeStatus } from "@/hooks/useRealtimeStatus";

export type RealtimeContextValue = {
  status: RealtimeStatus;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children, status }: { children: React.ReactNode; status: RealtimeStatus }) {
  return <RealtimeContext.Provider value={{ status }}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtimeContext must be used within a RealtimeProvider");
  return ctx;
}

// Hook seguro que não lança erro (para uso em componentes de layout)
export function useRealtimeContextSafe(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  return ctx ?? { status: 'disconnected' };
}
