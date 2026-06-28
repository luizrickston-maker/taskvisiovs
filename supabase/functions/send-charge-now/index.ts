/**
 * send-charge-now
 *
 * Envia, sob demanda, a cobrança/lembrete de UMA cobrança específica para o
 * WhatsApp do cliente (via agzap) — independente da cadência diária.
 * Usado pelo botão "Enviar agora" na tela de Cobranças.
 *
 * Auth: Authorization bearer (usuário do app) + validação de acesso ao workspace.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AGZAP_TOKEN.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const AGZAP_URL = "https://app.agzap.com.br/send";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function daysUntil(due: string): number {
  const a = new Date(`${due}T12:00:00-03:00`).getTime();
  const b = new Date(`${today()}T12:00:00-03:00`).getTime();
  return Math.round((a - b) / 86400000);
}
function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}
function money(v: number) { return `R$ ${Number(v).toFixed(2).replace(".", ",")}`; }
function brDate(iso: string) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const { data: { user }, error: uErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (uErr || !user) return json({ error: "Sessão inválida" }, 401);

    const { charge_id } = await req.json();
    if (!charge_id) return json({ error: "charge_id obrigatório" }, 400);

    const { data: c } = await supabase.from("client_charges").select("*").eq("id", charge_id).maybeSingle();
    if (!c) return json({ error: "cobrança não encontrada" }, 404);

    // Valida acesso do usuário ao workspace da cobrança.
    const { data: member } = await supabase.from("workspace_members")
      .select("user_id").eq("workspace_id", c.workspace_id).eq("user_id", user.id).maybeSingle();
    const { data: ws } = await supabase.from("workspaces")
      .select("owner_user_id").eq("id", c.workspace_id).maybeSingle();
    if (!member && ws?.owner_user_id !== user.id) return json({ error: "acesso negado" }, 403);

    if (c.status === "pago" || c.status === "cancelado") {
      return json({ error: `cobrança ${c.status}; nada a enviar` }, 400);
    }

    const { data: cliente } = await supabase.from("clients")
      .select("name, phone").eq("id", c.client_id).maybeSingle();
    const number = normalizeNumber(cliente?.phone ?? null);
    if (!number) return json({ error: "cliente sem WhatsApp cadastrado" }, 400);

    const nome = cliente?.name ?? "Olá";
    const offset = daysUntil(c.due_date);
    const link = c.payment_link ? `\n\n💳 Pague aqui:\n${c.payment_link}` : "";
    let msg: string;
    if (offset > 0) {
      msg = `Olá, ${nome}! 👋\n\nLembrete: a cobrança *${c.descricao}* de ${money(c.valor)} vence em ${brDate(c.due_date)} (${offset} dia${offset > 1 ? "s" : ""}).${link}`;
    } else if (offset === 0) {
      msg = `Olá, ${nome}! 👋\n\nSua cobrança *${c.descricao}* de ${money(c.valor)} *vence hoje* (${brDate(c.due_date)}).${link}`;
    } else {
      msg = `Olá, ${nome}.\n\nA cobrança *${c.descricao}* de ${money(c.valor)} está *vencida* desde ${brDate(c.due_date)}. Por favor, regularize.${link}`;
    }

    const token = Deno.env.get("AGZAP_TOKEN");
    if (!token) return json({ error: "AGZAP_TOKEN não configurado" }, 500);
    const resp = await fetch(AGZAP_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, number, type: "text", message: msg }),
    });
    const txt = await resp.text();

    await supabase.from("client_charge_events").insert({
      charge_id: c.id, kind: "manual", reference: new Date().toISOString(),
      status: resp.ok ? "sent" : "error", detail: txt.slice(0, 200),
    });

    if (!resp.ok) return json({ error: "agzap_failed", body: txt.slice(0, 200) }, 502);
    return json({ ok: true, to: number });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});