/**
 * notify-task-assigned
 *
 * Chamada pelo trigger `notify_task_assignment` (pg_net) quando uma tarefa é
 * atribuída/reatribuída a um colaborador. Enriquece os dados e envia uma
 * notificação de WhatsApp via agzap (POST https://app.agzap.com.br/send).
 *
 * Auth: verify_jwt = false; valida o header x-notify-secret == NOTIFY_SECRET.
 * Segredos (env): NOTIFY_SECRET, AGZAP_TOKEN.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notify-secret",
};

const AGZAP_URL = "https://app.agzap.com.br/send";

// priority (1..5) -> rótulo de urgência. 1 = mais urgente (entrega no mesmo dia).
const URGENCIA: Record<number, string> = {
  1: "🔴 Crítica (entrega no mesmo dia)",
  2: "🟠 Alta",
  3: "🟡 Média",
  4: "🟢 Baixa",
  5: "⚪ Mínima",
};

/** Normaliza para formato internacional só-dígitos. BR: assume DDI 55 se ausente. */
function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  // 10 (fixo+DDD) ou 11 (celular+DDD) dígitos => número BR local sem DDI.
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

/** Prazo em data detalhada pt-BR (ex.: "sexta-feira, 17 de julho de 2026").
 *  Ancora ao meio-dia para datas YYYY-MM-DD não sofrerem shift de fuso. */
function formatDeadline(iso: string | null): string {
  if (!iso) return "Sem prazo definido";
  const base = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso;
  const d = new Date(base);
  if (isNaN(d.getTime())) return iso;
  const full = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
  const curta = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `${full} (${curta})`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // 1) Autenticação por segredo compartilhado
  const secret = req.headers.get("x-notify-secret");
  if (!secret || secret !== Deno.env.get("NOTIFY_SECRET")) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const { task_id, assigned_to } = await req.json();
    if (!task_id || !assigned_to) {
      return json({ error: "task_id e assigned_to são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 2) Dedupe: registra a intenção; se já existe (mesma tarefa+pessoa), pula.
    const { error: dedupeErr } = await supabase
      .from("task_assignment_notifications")
      .insert({ task_id, member_user_id: assigned_to, status: "processing" });
    if (dedupeErr) {
      // Violação de unique => já notificado antes.
      return json({ skipped: "already_notified" });
    }

    const finalize = (status: string, detail?: string) =>
      supabase
        .from("task_assignment_notifications")
        .update({ status, detail: detail ?? null })
        .eq("task_id", task_id)
        .eq("member_user_id", assigned_to);

    // 3) Enriquecimento
    const { data: task } = await supabase
      .from("project_tasks")
      .select("id, title, status, priority, deadline, project_id")
      .eq("id", task_id)
      .maybeSingle();

    if (!task) {
      await finalize("error", "task_not_found");
      return json({ error: "task_not_found" }, 404);
    }

    const { data: member } = await supabase
      .from("corporate_team")
      .select("name, whatsapp")
      .eq("member_user_id", assigned_to)
      .maybeSingle();

    const number = normalizeNumber(member?.whatsapp ?? null);
    if (!number) {
      await finalize("skipped_no_phone");
      return json({ skipped: "no_whatsapp" });
    }

    let projectName: string | null = null;
    let clientName: string | null = null;
    if (task.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("project, client_name")
        .eq("id", task.project_id)
        .maybeSingle();
      projectName = project?.project ?? null;
      clientName = project?.client_name ?? null;
    }

    // 4) Mensagem
    const urgencia = URGENCIA[task.priority as number] ?? "🟡 Média";
    const linhas = [
      "📌 *Nova tarefa atribuída a você!*",
      "",
      `*${task.title}*`,
      `Urgência: ${urgencia}`,
    ];
    if (projectName) linhas.push(`Projeto: ${projectName}${clientName ? ` • Cliente: ${clientName}` : ""}`);
    linhas.push(`📅 Prazo de entrega: ${formatDeadline(task.deadline)}`);
    linhas.push("", "Acesse o portal do colaborador para ver os detalhes.");
    const message = linhas.join("\n");

    // 5) Envio via agzap
    const token = Deno.env.get("AGZAP_TOKEN");
    if (!token) {
      await finalize("error", "missing_agzap_token");
      return json({ error: "AGZAP_TOKEN não configurado" }, 500);
    }

    const resp = await fetch(AGZAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, number, type: "text", message }),
    });
    const respText = await resp.text();

    if (!resp.ok) {
      await finalize("error", `agzap_${resp.status}: ${respText.slice(0, 300)}`);
      return json({ error: "agzap_failed", status: resp.status, body: respText.slice(0, 300) }, 502);
    }

    await finalize("sent", respText.slice(0, 300));
    return json({ sent: true, to: number });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
