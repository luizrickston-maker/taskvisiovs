/**
 * notify-appointment
 *
 * Envia pelo WhatsApp o compromisso recém-criado para o colaborador e registra
 * a tentativa. Invocado pelo cliente logo após um INSERT bem-sucedido - não
 * existe caminho aqui para edição ou cancelamento (NOTIF-07).
 *
 * Leitura com a identidade de quem chamou (cliente montado a partir do header
 * Authorization): a RLS decide se esse chamador enxerga o compromisso.
 * Escrita no log vai pelo service_role, porque appointment_notification_log
 * não tem policy nenhuma de propósito.
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *      AGZAP_URL, AGZAP_TOKEN.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleNotifyAppointment,
  type AppointmentRow,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let payload: { appointment_id?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const appointmentId = payload?.appointment_id;
  if (typeof appointmentId !== "string" || appointmentId.length === 0) {
    return json({ error: "appointment_id é obrigatório" }, 400);
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
        .select("id, member_user_id, title, notes, date, start_time, end_time, status, notify_status")
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
    const result = await handleNotifyAppointment(appointmentId, {
      env: (name) => Deno.env.get(name),
      fetchImpl: (url, init) => fetch(url, init),
      store,
    });
    return json(result.body, result.status);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
