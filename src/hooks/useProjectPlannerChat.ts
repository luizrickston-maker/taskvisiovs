/**
 * useProjectPlannerChat — hook para conversar com o agente "Planejamento de Projeto".
 *
 * - Streaming SSE direto para a edge function ai-project-planner
 * - Mesma UX do useAskAI360Agent, mas focado em gerar plano de projeto
 * - onChunk é chamado incrementalmente; onDone recebe o texto completo
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlannerChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SendOptions {
  messages: PlannerChatMessage[];
  agentId?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string, full: string) => void;
}

export interface SendResult {
  ok: boolean;
  content: string;
  error?: string;
  code?: string;
}

async function readSseStream(
  response: Response,
  onChunk: (chunk: string, full: string) => void
): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE format: data: {...}\n\n
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") {
        return full;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          full += delta;
          onChunk(delta, full);
        }
      } catch {
        // skip malformed
      }
    }
  }
  return full;
}

export function useProjectPlannerChat() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (opts: SendOptions): Promise<SendResult> => {
    setIsSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Não autenticado");
        setIsSending(false);
        return { ok: false, content: "", error: "Não autenticado" };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-project-planner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: opts.messages,
          agent_id: opts.agentId,
        }),
        signal: opts.signal,
      });

      // Erro não-streaming (status 200 com payload de erro, ou 4xx/5xx)
      const ct = response.headers.get("Content-Type") || "";
      if (!ct.includes("text/event-stream")) {
        let payload: { error?: string; code?: string } = {};
        try {
          payload = await response.json();
        } catch {
          // ignore
        }
        const msg = payload.error || `Erro HTTP ${response.status}`;
        setError(msg);
        setIsSending(false);
        return { ok: false, content: "", error: msg, code: payload.code };
      }

      const full = await readSseStream(response, (chunk, current) => {
        opts.onChunk?.(chunk, current);
      });

      setIsSending(false);
      return { ok: true, content: full };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setIsSending(false);
      return { ok: false, content: "", error: msg };
    }
  }, []);

  return { send, isSending, error };
}
