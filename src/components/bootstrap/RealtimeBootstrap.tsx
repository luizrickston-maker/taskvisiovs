import React from "react";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { RealtimeProvider } from "@/contexts/RealtimeContext";

export function RealtimeBootstrap({
  userId,
  children,
}: {
  userId: string | undefined;
  children: React.ReactNode;
}) {
  useRealtimeSync(userId);
  const status = useRealtimeStatus(userId);

  return <RealtimeProvider status={status}>{children}</RealtimeProvider>;
}
