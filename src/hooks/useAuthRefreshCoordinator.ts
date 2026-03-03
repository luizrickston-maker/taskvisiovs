import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type RefreshState = "running" | "stopped";

type LeaderPayload = {
  tabId: string;
  heartbeat: number;
};

const LEADER_KEY = "tv_auth_refresh_leader_v1";
const HEARTBEAT_MS = 4000;
const STALE_AFTER_MS = 12000;

function createTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeReadLeader(): LeaderPayload | null {
  try {
    const raw = window.localStorage.getItem(LEADER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeaderPayload;

    if (!parsed?.tabId || typeof parsed.heartbeat !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function safeWriteLeader(payload: LeaderPayload) {
  try {
    window.localStorage.setItem(LEADER_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
}

function safeClearLeader(expectedTabId: string) {
  try {
    const current = safeReadLeader();
    if (current?.tabId === expectedTabId) {
      window.localStorage.removeItem(LEADER_KEY);
    }
  } catch {
    // noop
  }
}

export function useAuthRefreshCoordinator() {
  const tabId = useMemo(() => createTabId(), []);
  const refreshStateRef = useRef<RefreshState>("stopped");
  const heartbeatTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const now = () => Date.now();

    const isLeaderStale = (leader: LeaderPayload | null) => {
      if (!leader) return true;
      return now() - leader.heartbeat > STALE_AFTER_MS;
    };

    const startRefresh = () => {
      if (refreshStateRef.current === "running") return;
      supabase.auth.startAutoRefresh();
      refreshStateRef.current = "running";
      if (import.meta.env.DEV) {
        console.log("[AuthRefresh] ON", { tabId: tabId.slice(0, 8) });
      }
    };

    const stopRefresh = () => {
      if (refreshStateRef.current === "stopped") return;
      supabase.auth.stopAutoRefresh();
      refreshStateRef.current = "stopped";
      if (import.meta.env.DEV) {
        console.log("[AuthRefresh] OFF", { tabId: tabId.slice(0, 8) });
      }
    };

    const writeHeartbeat = () => {
      safeWriteLeader({ tabId, heartbeat: now() });
    };

    const ensureLeadership = () => {
      if (document.visibilityState !== "visible") {
        stopRefresh();
        safeClearLeader(tabId);
        return;
      }

      const leader = safeReadLeader();
      const shouldBecomeLeader = !leader || leader.tabId === tabId || isLeaderStale(leader);

      if (shouldBecomeLeader) {
        writeHeartbeat();
        startRefresh();
      } else {
        stopRefresh();
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
        const leader = safeReadLeader();
        if (leader?.tabId === tabId && document.visibilityState === "visible") {
          writeHeartbeat();
        } else {
          ensureLeadership();
        }
      }, HEARTBEAT_MS);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LEADER_KEY) return;

      const leader = safeReadLeader();
      if (!leader || leader.tabId === tabId || isLeaderStale(leader)) {
        ensureLeadership();
      } else {
        stopRefresh();
      }
    };

    const handleVisibility = () => {
      ensureLeadership();
    };

    const handlePageHide = () => {
      safeClearLeader(tabId);
      stopRefresh();
    };

    ensureLeadership();
    startHeartbeat();

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      stopHeartbeat();
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      handlePageHide();
    };
  }, [tabId]);
}
