import React from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useInitializeData } from "@/hooks/useInitializeData";
import { RealtimeBootstrap } from "@/components/bootstrap/RealtimeBootstrap";

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id;

  useInitializeData(userId);

  return <RealtimeBootstrap userId={userId}>{children}</RealtimeBootstrap>;
}
