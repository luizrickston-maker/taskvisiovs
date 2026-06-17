import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REALTIME_QUERY_BINDINGS } from "@/lib/realtime-query-config";

// Agrupa invalidações por uma pequena janela para coalescer rajadas de eventos
// (ex.: a IA inserindo várias linhas em sequência), evitando refetch repetido.
const FLUSH_DELAY_MS = 250;

/**
 * Mantém as telas baseadas em React Query sincronizadas em tempo real.
 *
 * Padrão recomendado para Supabase + React Query: em vez de mutar caches
 * manualmente, ouvimos `postgres_changes` e INVALIDAMOS as queryKeys
 * correspondentes (definidas em realtime-query-config). O refetch resultante é
 * protegido por RLS — então é seguro mesmo que a notificação chegue sem filtro
 * por usuário, e cada aparelho recebe apenas o que tem permissão de ver.
 *
 * Complementa useRealtimeSync, que cuida das tabelas do store global (Zustand).
 */
export function useRealtimeQueryInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const pendingKeys = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      for (const key of pendingKeys) {
        // queryKey de 1 elemento invalida por prefixo (todas as variações)
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      pendingKeys.clear();
    };

    const scheduleInvalidate = (keys: string[]) => {
      for (const key of keys) pendingKeys.add(key);
      if (flushTimer === null) {
        flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
      }
    };

    let channel = supabase.channel("rq-realtime-sync");
    for (const binding of REALTIME_QUERY_BINDINGS) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: binding.table },
        () => scheduleInvalidate(binding.queryKeys)
      );
    }
    channel.subscribe();

    return () => {
      if (flushTimer !== null) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
