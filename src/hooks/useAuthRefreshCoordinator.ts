import { useEffect, useMemo, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type LeaderPayload = {
  tabId: string;
  heartbeat: number;
};

type RefreshLockPayload = {
  tabId: string;
  ts: number;
};

const LEADER_KEY = "tv_auth_refresh_leader_v1";
const REFRESH_LOCK_KEY = "tv_auth_refresh_lock_v1";
const HEARTBEAT_MS = 4000;
const STALE_AFTER_MS = 12000;
const REFRESH_LOCK_MS = 15000;
const REFRESH_BUFFER_MS = 90_000;
const MIN_REFRESH_DELAY_MS = 15_000;

function createTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson<T>(key: string, payload: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // noop
  }
}

function safeClearOwnedKey(key: string, expectedTabId: string) {
  try {
    const current = safeReadJson<{ tabId?: string }>(key);
    if (current?.tabId === expectedTabId) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

export function useAuthRefreshCoordinator() {
  const tabId = useMemo(() => createTabId(), []);
  const heartbeatTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let isUnmounted = false;
    const now = () => Date.now();
    const isVisible = () => document.visibilityState === "visible";

    const isLeaderStale = (leader: LeaderPayload | null) => {
      if (!leader) return true;
      return now() - leader.heartbeat > STALE_AFTER_MS;
    };

    const readLeader = () => safeReadJson<LeaderPayload>(LEADER_KEY);

    const writeLeaderHeartbeat = () => {
      safeWriteJson<LeaderPayload>(LEADER_KEY, { tabId, heartbeat: now() });
    };

    const ensureLeadership = () => {
      if (!isVisible()) return false;

      const leader = readLeader();
      const shouldBecomeLeader = !leader || leader.tabId === tabId || isLeaderStale(leader);

      if (shouldBecomeLeader) {
        writeLeaderHeartbeat();
      }

      return readLeader()?.tabId === tabId;
    };

    const clearRefreshTimer = () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };

    const readRefreshLock = () => safeReadJson<RefreshLockPayload>(REFRESH_LOCK_KEY);

    const acquireRefreshLock = () => {
      const currentLock = readRefreshLock();
      const lockIsFresh = currentLock && now() - currentLock.ts < REFRESH_LOCK_MS;

      if (lockIsFresh && currentLock.tabId !== tabId) {
        return false;
      }

      safeWriteJson<RefreshLockPayload>(REFRESH_LOCK_KEY, { tabId, ts: now() });
      return readRefreshLock()?.tabId === tabId;
    };

    const releaseRefreshLock = () => {
      safeClearOwnedKey(REFRESH_LOCK_KEY, tabId);
    };

    const scheduleRefreshFromSession = async (sessionOverride?: Session | null) => {
      clearRefreshTimer();

      if (isUnmounted || !isVisible() || !ensureLeadership()) return;

      let session = sessionOverride;
      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }

      if (!session?.expires_at) return;

      const refreshInMs = Math.max(
        MIN_REFRESH_DELAY_MS,
        session.expires_at * 1000 - now() - REFRESH_BUFFER_MS
      );

      refreshTimerRef.current = window.setTimeout(() => {
        void runRefresh("timer");
      }, refreshInMs);

      if (import.meta.env.DEV) {
        console.log("[AuthRefresh] scheduled", {
          tabId: tabId.slice(0, 8),
          inMs: refreshInMs,
          expiresAt: new Date(session.expires_at * 1000).toISOString(),
        });
      }
    };

    const runRefresh = async (reason: "timer" | "visibility" | "auth_event") => {
      if (isUnmounted || refreshInFlightRef.current) return;
      if (!isVisible() || !ensureLeadership()) return;
      
      // Se for SIGNED_IN, esperamos um pouco para o Supabase processar a sessão inicial
      if (reason === "auth_event") {
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!acquireRefreshLock()) return;

      refreshInFlightRef.current = true;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // Se a sessão ainda é válida por mais de 5 minutos, não forçamos refresh agora
        // a menos que o timer tenha disparado (reason === "timer")
        if (currentSession?.expires_at) {
          const timeUntilExpiry = currentSession.expires_at * 1000 - now();
          if (reason !== "timer" && timeUntilExpiry > 300_000) {
             await scheduleRefreshFromSession(currentSession);
             return;
          }
        }

        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          if (import.meta.env.DEV) {
            console.warn("[AuthRefresh] refresh failed", {
              reason,
              tabId: tabId.slice(0, 8),
              message: error.message,
            });
          }
          
          // Se o erro for session_not_found e não for inicial, talvez a sessão tenha caído
          if (error.message?.includes("session_not_found") && reason === "timer") {
             // Deixa o onAuthStateChange lidar com o logout
          }
          return;
        }

        await scheduleRefreshFromSession(data.session ?? null);
      } finally {
        refreshInFlightRef.current = false;
        releaseRefreshLock();
      }
    };

    const stopHeartbeat = () => {
      if (heartbeatTimerRef.current !== null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      heartbeatTimerRef.current = window.setInterval(() => {
        if (isUnmounted || !isVisible()) return;

        if (ensureLeadership()) {
          writeLeaderHeartbeat();
        }
      }, HEARTBEAT_MS);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LEADER_KEY && event.key !== REFRESH_LOCK_KEY) return;
      if (!isVisible()) return;

      if (ensureLeadership()) {
        void scheduleRefreshFromSession();
      } else {
        clearRefreshTimer();
      }
    };

    const handleVisibility = () => {
      if (!isVisible()) {
        clearRefreshTimer();
        return;
      }

      if (ensureLeadership()) {
        writeLeaderHeartbeat();
        void scheduleRefreshFromSession();
        void runRefresh("visibility");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isVisible() || !ensureLeadership()) return;

      if (event === "SIGNED_OUT") {
        clearRefreshTimer();
        safeClearOwnedKey(LEADER_KEY, tabId);
        releaseRefreshLock();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void scheduleRefreshFromSession(session ?? null);
        if (event === "SIGNED_IN") {
          void runRefresh("auth_event");
        }
      }
    });

    // Desativa o auto-refresh interno para evitar tempestade de refresh em iOS/Safari.
    supabase.auth.stopAutoRefresh();

    if (ensureLeadership()) {
      writeLeaderHeartbeat();
      void scheduleRefreshFromSession();
    }

    startHeartbeat();

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handleVisibility);

    return () => {
      isUnmounted = true;
      clearRefreshTimer();
      stopHeartbeat();
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handleVisibility);
      safeClearOwnedKey(LEADER_KEY, tabId);
      releaseRefreshLock();
    };
  }, [tabId]);
}
