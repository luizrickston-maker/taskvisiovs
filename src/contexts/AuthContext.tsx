import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthRefreshCoordinator } from "@/hooks/useAuthRefreshCoordinator";

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
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useAuthRefreshCoordinator();

  useEffect(() => {
    let initialized = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (import.meta.env.DEV) {
        console.log(
          "[Auth] onAuthStateChange event:",
          event,
          session?.user?.email ?? "no-session"
        );
      }

      // Tratamento de SIGNED_OUT inesperado (comum em Safari/iPad/Mobile)
      if (event === "SIGNED_OUT" && !manualSignOutRef.current) {
        if (signedOutRecoveryInFlightRef.current) return;

        if (import.meta.env.DEV) console.warn("[Auth] SIGNED_OUT detectado. Verificando persistência da sessão...");
        signedOutRecoveryInFlightRef.current = true;
        
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const { data: { session: recovered } } = await supabase.auth.getSession();
        
        if (recovered) {
          if (import.meta.env.DEV) console.warn("[Auth] Sessão recuperada com sucesso após SIGNED_OUT falso.");
          setSession(recovered);
          setUser(recovered.user);
          setLoading(false);
          initialized = true;
          signedOutRecoveryInFlightRef.current = false;
          return;
        }
        
        if (import.meta.env.DEV) console.error("[Auth] Sessão realmente expirada ou inválida.");
        setSession(null);
        setUser(null);
        resetStore();
        setLoading(false);
        initialized = true;
        signedOutRecoveryInFlightRef.current = false;
        return;
      }

      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        initialized = true;
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        resetStore();
        setLoading(false);
        initialized = true;
      } else if (event === "INITIAL_SESSION" && !session && !initialized) {
        if (import.meta.env.DEV) console.log("[Auth] INITIAL_SESSION nula ignorada - aguardando initSession");
      }
    });

    // Carga inicial robusta para Safari/iPad/Dispositivos Móveis
    const initSession = async (retries = 3) => {
      if (isUnmounted) return;
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!initialized && !isUnmounted) {
          if (currentSession) {
            if (import.meta.env.DEV) console.log("[Auth] Sessão inicial encontrada");
            setSession(currentSession);
            setUser(currentSession.user);
            setLoading(false);
            initialized = true;
          } else if (retries > 0) {
            if (import.meta.env.DEV) console.warn(`[Auth] Nenhuma sessão encontrada, tentando novamente em 500ms... (${retries} restantes)`);
            retryTimeoutRef.current = setTimeout(() => initSession(retries - 1), 500);
          } else {
            if (import.meta.env.DEV) console.log("[Auth] Nenhuma sessão persistente encontrada após retentativas");
            setLoading(false);
            initialized = true;
          }
        }
      } catch (err) {
        if (retries > 0) {
          if (import.meta.env.DEV) console.error("[Auth] Erro ao carregar sessão inicial, tentando novamente...", err);
          retryTimeoutRef.current = setTimeout(() => initSession(retries - 1), 1000);
        } else {
          if (!isUnmounted) {
            setLoading(false);
            initialized = true;
          }
        }
      }
    };

    let isUnmounted = false;
    initSession();

    return () => {
      isUnmounted = true;
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [resetStore]);

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

    // SECURITY: Immediate local state clear before API call to prevent stale session usage
    setUser(null);
    setSession(null);
    resetStore();

    try {
      const { error } = await supabase.auth.signOut();
      if (error && !error.message?.includes('session_not_found')) {
        if (import.meta.env.DEV) console.error("[Auth] SignOut API error:", error);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log("[Auth] SignOut unexpected error:", error);
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
