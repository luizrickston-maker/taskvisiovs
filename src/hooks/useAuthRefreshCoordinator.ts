import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Coordenador de refresh de sessão.
 *
 * Estratégia: deixar o supabase-js renovar o token NATIVAMENTE
 * (`autoRefreshToken: true`). A partir da v2, a lib serializa o refresh entre
 * abas/janelas do mesmo navegador usando a Web Locks API, então não há risco
 * de duas abas rotacionarem o refresh token (que é de uso único) ao mesmo tempo.
 *
 * Este hook apenas PAUSA o auto-refresh quando a aba/app fica em segundo plano e
 * o RETOMA ao voltar para o primeiro plano — padrão recomendado pela Supabase
 * para mobile/PWA, onde o sistema operacional congela os timers de JS em
 * background (típico no iPad/iOS). Ao retomar, `startAutoRefresh()` revalida e,
 * se necessário, renova a sessão imediatamente.
 *
 * IMPORTANTE: NÃO chamamos `refreshSession()` manualmente aqui. Fazer isso em
 * paralelo ao refresh nativo causava corrida pelo refresh token e resultava em
 * `refresh_token_not_found` / `session_not_found` → logout inesperado no
 * iPad/Safari ao desbloquear o aparelho ou voltar para o app.
 */
export function useAuthRefreshCoordinator() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const resume = () => {
      // Retoma o ciclo de auto-refresh; o primeiro "tick" revalida a sessão e
      // renova o token caso esteja perto de expirar (tudo dentro do Web Lock).
      supabase.auth.startAutoRefresh();
    };

    const pause = () => {
      // Pausa enquanto está oculto para não agendar refresh com timers
      // congelados pelo SO.
      supabase.auth.stopAutoRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resume();
      } else {
        pause();
      }
    };

    // Estado inicial coerente com a visibilidade atual.
    handleVisibilityChange();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    // `pageshow` cobre o bfcache do Safari (voltar/avançar e retomar PWA da
    // tela inicial); `focus` cobre o retorno de foco no desktop.
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pagehide", pause);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pagehide", pause);
    };
  }, []);
}
