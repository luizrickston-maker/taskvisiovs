/**
 * notify-appointment
 *
 * Envia pelo WhatsApp o aviso de um compromisso e registra a tentativa.
 * O corpo pede `kind` (ACK-02..ACK-05); sem ele vale a criação, que é o que o
 * cliente antigo manda:
 *   - `created`                   -> o colaborador;
 *   - `cancelled_by_collaborator` -> os destinatários `agenda` do workspace;
 *   - `cancelled_by_manager`      -> o colaborador.
 * Edição continua sem notificação nenhuma (NOTIF-07).
 *
 * Leitura do compromisso com a identidade de quem chamou (cliente montado a
 * partir do header Authorization): a RLS decide se esse chamador enxerga a
 * linha. Destinatários do workspace são lidos com service_role, porque o
 * colaborador que cancela não é membro dele. Escrita no log vai pelo
 * service_role, porque appointment_notification_log não tem policy nenhuma de
 * propósito.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *      AGZAP_URL, AGZAP_TOKEN.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleNotifyAppointment,
  type AppointmentRow,
  type NotifyKind,
  type NotifyStore,
} from "../_shared/notify-appointment.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** Mesma regra do process-agenda-reminders: só dígitos, com DDI 55 se faltar. */
function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
}

const KINDS: readonly NotifyKind[] = [
  "created",
  "cancelled_by_collaborator",
  "cancelled_by_manager",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let payload: { appointment_id?: unknown; kind?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const appointmentId = payload?.appointment_id;
  if (typeof appointmentId !== "string" || appointmentId.length === 0) {
    return json({ error: "appointment_id é obrigatório" }, 400);
  }

  // Sem `kind` vale a criação: o cliente que ainda não foi atualizado continua
  // notificando do jeito certo.
  const kind: NotifyKind =
    payload?.kind === undefined || payload?.kind === null ? "created" : (payload.kind as NotifyKind);
  if (!KINDS.includes(kind)) {
    return json({ error: `kind inválido: ${String(payload.kind)}` }, 400);
  }

  const baseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!baseUrl || !anonKey || !serviceKey) {
    return json({ error: "credenciais do Supabase ausentes" }, 500);
  }

  const userClient = createClient(baseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const adminClient = createClient(baseUrl, serviceKey);

  const store: NotifyStore = {
    async getAppointment(id) {
      const { data } = await userClient
        .from("collaborator_appointments")
        .select("id, workspace_id, member_user_id, title, notes, date, start_time, end_time, status, notify_status")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      return data as unknown as AppointmentRow;
    },

    async getCollaborator(memberUserId) {
      const { data } = await userClient
        .from("corporate_team")
        .select("name, whatsapp")
        .eq("member_user_id", memberUserId)
        .maybeSingle();
      if (!data) return null;
      return { name: data.name ?? "", whatsapp: data.whatsapp ?? null };
    },

    // ACK-03: mesma resolução do process-agenda-reminders (linhas ativas com
    // types @> {agenda}), lida com service_role porque quem cancela é o
    // colaborador e ele não é membro do workspace.
    async getAgendaRecipients(workspaceId) {
      const { data } = await adminClient
        .from("notification_recipients")
        .select("whatsapp")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .contains("types", ["agenda"]);
      return ((data ?? []) as Array<{ whatsapp: string | null }>)
        .map((row) => normalizeNumber(row.whatsapp))
        .filter((number): number is string => number !== null);
    },

    async getWorkspaceNotifyWhatsapp(workspaceId) {
      const { data } = await adminClient
        .from("workspaces")
        .select("notify_whatsapp")
        .eq("id", workspaceId)
        .maybeSingle();
      return normalizeNumber((data?.notify_whatsapp as string | null) ?? null);
    },

    async nextAttempt(id) {
      const { data } = await adminClient
        .from("appointment_notification_log")
        .select("attempt")
        .eq("appointment_id", id)
        .order("attempt", { ascending: false })
        .limit(1)
        .maybeSingle();
      return ((data?.attempt as number | undefined) ?? 0) + 1;
    },

    async claimAttempt(id, attempt) {
      // Prefer: resolution=ignore-duplicates => INSERT ... ON CONFLICT DO NOTHING.
      const { data, error } = await adminClient
        .from("appointment_notification_log")
        .upsert(
          { appointment_id: id, attempt },
          { onConflict: "appointment_id,attempt", ignoreDuplicates: true }
        )
        .select("id");
      if (error) throw new Error(error.message);
      return (data?.length ?? 0) > 0;
    },

    async recordAttempt(id, attempt, status, providerResponse) {
      const { error } = await adminClient
        .from("appointment_notification_log")
        .update({ status, provider_response: providerResponse })
        .eq("appointment_id", id)
        .eq("attempt", attempt);
      if (error) throw new Error(error.message);
    },

    async setNotifyStatus(id, status) {
      const { error } = await adminClient
        .from("collaborator_appointments")
        .update({ notify_status: status })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
  };

  try {
    const result = await handleNotifyAppointment(
      appointmentId,
      {
        env: (name) => Deno.env.get(name),
        fetchImpl: (url, init) => fetch(url, init),
        store,
      },
      kind
    );
    return json(result.body, result.status);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
