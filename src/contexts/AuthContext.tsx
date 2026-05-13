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

  useAuthRefreshCoordinator();

  useEffect(() => {
    // Flag para evitar múltiplas chamadas iniciais
    let initialized = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "[Auth] onAuthStateChange:",
        event,
        session?.user?.email ?? "no-session"
      );

      // Tratamento de SIGNED_OUT inesperado (comum em Safari/iPad após 429)
      if (event === "SIGNED_OUT" && !manualSignOutRef.current) {
        if (signedOutRecoveryInFlightRef.current) return;

        signedOutRecoveryInFlightRef.current = true;
        setLoading(true);

        // Espera um pouco para o Supabase/Rede estabilizar
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const { data: { session: recovered } } = await supabase.auth.getSession();
        
        if (recovered) {
          console.warn("[Auth] Sessão recuperada após SIGNED_OUT falso");
          setSession(recovered);
          setUser(recovered.user);
          setLoading(false);
          signedOutRecoveryInFlightRef.current = false;
          return;
        }
        
        console.error("[Auth] Logout confirmado");
        setSession(null);
        setUser(null);
        resetStore();
        setLoading(false);
        signedOutRecoveryInFlightRef.current = false;
        return;
      }

      if (session) {
        setSession(session);
        setUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        resetStore();
      }
      
      setLoading(false);
    });

    // Carga inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        initialized = true;
      }
    });

    return () => subscription.unsubscribe();
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
        console.error("[Auth] SignOut API error:", error);
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
