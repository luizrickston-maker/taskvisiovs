import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";

// Tipos específicos para as respostas de autenticação
type AuthResult<T> = { data: T; error: AuthError | null };
type SignUpData = { user: User | null; session: Session | null };
type SignInData = { user: User | null; session: Session | null };

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult<SignUpData>>;
  signIn: (email: string, password: string) => Promise<AuthResult<SignInData>>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const resetStore = useAppStore((s) => s.resetStore);
  const manualSignOutRef = useRef(false);
  const signedOutRecoveryInFlightRef = useRef(false);
  const lastGoodSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    // Set up listener FIRST (before getSession) to avoid race conditions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        "[Auth] onAuthStateChange:",
        event,
        session?.user?.email ?? "no-session",
        "expires_at:",
        session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : "n/a"
      );

      if (event === "SIGNED_OUT" && !manualSignOutRef.current) {
        if (signedOutRecoveryInFlightRef.current) return;

        signedOutRecoveryInFlightRef.current = true;
        setLoading(true);

        void (async () => {
          // Grace period para Safari/iPad quando há falha transitória de refresh
          await new Promise((resolve) => setTimeout(resolve, 700));

          let recoveredSession: Session | null = null;
          const firstTry = await supabase.auth.getSession();
          recoveredSession = firstTry.data.session;

          if (!recoveredSession) {
            // 2ª tentativa curta para absorver jitter/retries após 429 temporário
            await new Promise((resolve) => setTimeout(resolve, 1200));
            const secondTry = await supabase.auth.getSession();
            recoveredSession = secondTry.data.session;
          }

          if (recoveredSession) {
            console.warn("[Auth] SIGNED_OUT transitório detectado — sessão recuperada");
            lastGoodSessionRef.current = recoveredSession;
            setSession(recoveredSession);
            setUser(recoveredSession.user ?? null);
          } else {
            console.warn("[Auth] SIGNED_OUT confirmado — limpando store");
            lastGoodSessionRef.current = null;
            setSession(null);
            setUser(null);
            resetStore();
          }

          setLoading(false);
          signedOutRecoveryInFlightRef.current = false;
        })();

        return;
      }

      if (session) {
        lastGoodSessionRef.current = session;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        console.warn("[Auth] SIGNED_OUT manual — clearing store");
        manualSignOutRef.current = false;
        lastGoodSessionRef.current = null;
        resetStore();
      }

      if (event === "TOKEN_REFRESHED") {
        console.log("[Auth] Token refreshed successfully");
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("[Auth] getSession:", session?.user?.email ?? "no-session", "error:", error?.message ?? "none");
      if (session) {
        lastGoodSessionRef.current = session;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resetStore]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncAutoRefreshWithVisibility = () => {
      const shouldRefresh = document.visibilityState === "visible";

      if (shouldRefresh) {
        supabase.auth.startAutoRefresh();
        if (import.meta.env.DEV) console.log("[Auth] Auto refresh: ON (visible tab)");
      } else {
        supabase.auth.stopAutoRefresh();
        if (import.meta.env.DEV) console.log("[Auth] Auto refresh: OFF (hidden tab)");
      }
    };

    syncAutoRefreshWithVisibility();

    document.addEventListener("visibilitychange", syncAutoRefreshWithVisibility);
    window.addEventListener("focus", syncAutoRefreshWithVisibility);
    window.addEventListener("blur", syncAutoRefreshWithVisibility);
    window.addEventListener("pageshow", syncAutoRefreshWithVisibility);

    return () => {
      document.removeEventListener("visibilitychange", syncAutoRefreshWithVisibility);
      window.removeEventListener("focus", syncAutoRefreshWithVisibility);
      window.removeEventListener("blur", syncAutoRefreshWithVisibility);
      window.removeEventListener("pageshow", syncAutoRefreshWithVisibility);
      supabase.auth.startAutoRefresh();
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { data, error };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    manualSignOutRef.current = true;
    lastGoodSessionRef.current = null;

    // Limpar estado local PRIMEIRO (antes da API)
    setUser(null);
    setSession(null);
    resetStore();

    // Tentar fazer logout na API (ignorar erros de sessão não encontrada)
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignorar erros - o estado local já foi limpo
      if (import.meta.env.DEV) {
        console.log("[Auth] SignOut API error (ignored):", error);
      }
    }
  };

  const resetPassword: AuthContextValue["resetPassword"] = async (email) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;

    if (import.meta.env.DEV) {
      console.log("[Auth] Requesting password reset for:", email, "redirectTo:", redirectUrl);
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (import.meta.env.DEV) {
      if (error) {
        console.error("[Auth] Reset password API error:", error);
      } else {
        console.log("[Auth] Password reset email requested successfully");
      }
    }

    return { error };
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, signUp, signIn, signOut, resetPassword }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
}

// Hook seguro para uso em layouts (não lança erro)
export function useAuthContextSafe(): AuthContextValue | null {
  return useContext(AuthContext);
}
