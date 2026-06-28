/**
 * notify-task-status
 *
 * Chamada pelo trigger `notify_task_status_change` (pg_net) quando um colaborador
 * muda o status de uma tarefa. Enriquece os dados e notifica o GESTOR no WhatsApp
 * via agzap (POST https://app.agzap.com.br/send).
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

// Mapa de status -> rótulo legível.
const STATUS_LABEL: Record<string, string> = {
  todo: "↩️ Reaberta (a fazer)",
  in_progress: "▶️ Iniciada",
  done: "✅ Concluída",
  blocked: "⛔ Bloqueada",
  review: "👀 Em revisão",
};

/** Normaliza para formato internacional só-dígitos. BR: assume DDI 55 se ausente. */
function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

/** Data/hora exata em pt-BR, fuso de São Paulo (ex.: "24/06/2026 14:32:05"). */
function formatDateTime(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
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

  // 1) Autenticação por segredo compartilhado.
  const secret = req.headers.get("x-notify-secret");
  if (!secret || secret !== Deno.env.get("NOTIFY_SECRET")) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const { task_id, new_status, changed_by, occurred_at } = await req.json();
    if (!task_id || !new_status) {
      return json({ error: "task_id e new_status são obrigatórios" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const log = (status: string, detail?: string) =>
      supabase.from("task_status_notifications").insert({
        task_id,
        new_status,
        changed_by: changed_by ?? null,
        status,
        detail: detail ?? null,
      });

    // 2) Enriquecimento: tarefa.
    const { data: task } = await supabase
      .from("project_tasks")
      .select("id, title, status, project_id, user_id, workspace_id, assigned_to")
      .eq("id", task_id)
      .maybeSingle();

    if (!task) {
      await log("error", "task_not_found");
      return json({ error: "task_not_found" }, 404);
    }

    // 3) Destinatários do tipo "tarefas" (notification_recipients), com fallback
    //    ao número único legado (workspaces.notify_whatsapp).
    let wsId = (task.workspace_id ?? null) as string | null;
    if (!wsId && task.user_id) {
      const { data: w } = await supabase.from("workspaces")
        .select("id").eq("owner_user_id", task.user_id).maybeSingle();
      wsId = w?.id ?? null;
    }
    let numbers: string[] = [];
    if (wsId) {
      const { data: recps } = await supabase.from("notification_recipients")
        .select("whatsapp").eq("workspace_id", wsId).eq("is_active", true)
        .contains("types", ["tarefas"]);
      numbers = ((recps ?? []) as any[])
        .map((r) => normalizeNumber(r.whatsapp)).filter((n): n is string => !!n);
      if (numbers.length === 0) {
        const { data: ws } = await supabase.from("workspaces")
          .select("notify_whatsapp").eq("id", wsId).maybeSingle();
        const n = normalizeNumber(ws?.notify_whatsapp ?? null);
        if (n) numbers = [n];
      }
    }

    if (numbers.length === 0) {
      await log("skipped_no_phone", "sem destinatário para 'tarefas'");
      return json({ skipped: "no_recipient" });
    }

    // 4) Nome do colaborador (quem alterou; fallback p/ responsável).
    const memberId = changed_by ?? task.assigned_to;
    let collaboratorName = "Colaborador";
    if (memberId) {
      const { data: member } = await supabase
        .from("corporate_team")
        .select("name")
        .eq("member_user_id", memberId)
        .maybeSingle();
      if (member?.name) collaboratorName = member.name;
    }

    // 5) Projeto / cliente.
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

    // 6) Mensagem.
    const label = STATUS_LABEL[new_status] ?? new_status;
    const linhas = [
      "🔔 *Atualização de tarefa*",
      "",
      `👤 ${collaboratorName}`,
      `📋 *${task.title}*`,
      `➡️ Status: ${label}`,
      `🕐 ${formatDateTime(occurred_at ?? null)}`,
    ];
    if (projectName) linhas.push(`📁 Projeto: ${projectName}${clientName ? ` • Cliente: ${clientName}` : ""}`);
    const message = linhas.join("\n");

    // 7) Envio via agzap.
    const token = Deno.env.get("AGZAP_TOKEN");
    if (!token) {
      await log("error", "missing_agzap_token");
      return json({ error: "AGZAP_TOKEN não configurado" }, 500);
    }

    let enviados = 0;
    for (const number of numbers) {
      const resp = await fetch(AGZAP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, number, type: "text", message }),
      });
      if (resp.ok) enviados++;
    }

    await log(enviados > 0 ? "sent" : "error", `enviados ${enviados}/${numbers.length}`);
    return json({ sent: enviados > 0, count: enviados });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});