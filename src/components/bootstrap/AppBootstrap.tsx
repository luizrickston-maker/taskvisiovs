import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useInitializeData } from "@/hooks/useInitializeData";
import { RealtimeBootstrap } from "@/components/bootstrap/RealtimeBootstrap";

// Verifica se está em safe mode via URL
function useSafeMode() {
  const location = useLocation();
  return new URLSearchParams(location.search).get('safe') === '1';
}

export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id;
  const safeMode = useSafeMode();
  const location = useLocation();

  // Boot trace em DEV
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AppBootstrap] Inicializando', {
        userId: userId ? userId.slice(0, 8) + '...' : null,
        route: location.pathname,
        safeMode,
      });
    }
  }, [userId, location.pathname, safeMode]);

  // Em safe mode, pula inicialização de dados
  if (!safeMode) {
    useInitializeData(userId);
  } else if (import.meta.env.DEV) {
    console.log('[AppBootstrap] Safe mode ativo - pulando inicialização de dados');
  }

  return (
    <RealtimeBootstrap userId={userId} disabled={safeMode}>
      {children}
    </RealtimeBootstrap>
  );
}
