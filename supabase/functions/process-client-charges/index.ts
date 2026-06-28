/**
 * process-client-charges
 *
 * Rodada diária (via pg_cron) que envia, pelo WhatsApp (agzap), os avisos de
 * cobrança a cada cliente, conforme a cadência configurada:
 *   - lembrete: X dias antes do vencimento (alert_days_before)
 *   - cobranca: no dia do vencimento (D0)
 *   - atraso:   a cada overdue_every_days após o vencimento, até overdue_max vezes
 *
 * Idempotente: cada (cobranca, tipo, referencia) é registrado em
 * client_charge_events com UNIQUE, então nunca envia 2x o mesmo aviso.
 *
 * Auth: header x-notify-secret == NOTIFY_SECRET.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOTIFY_SECRET, AGZAP_TOKEN.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AGZAP_URL = "https://app.agzap.com.br/send";

// deno-lint-ignore no-explicit-any
type SB = ReturnType<typeof createClient<any>>;

function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** Diferença em dias inteiros: due_date - hoje (futuro positivo). */
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

async function sendWhatsapp(number: string, message: string): Promise<{ ok: boolean; detail: string }> {
  const token = Deno.env.get("AGZAP_TOKEN");
  if (!token) return { ok: false, detail: "missing_agzap_token" };
  const resp = await fetch(AGZAP_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, number, type: "text", message }),
  });
  const t = await resp.text();
  return { ok: resp.ok, detail: t.slice(0, 200) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);

  const secret = req.headers.get("x-notify-secret");
  if (!secret || secret !== Deno.env.get("NOTIFY_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const sb: SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Configs de cadência por workspace.
  const { data: wss } = await sb.from("workspaces")
    .select("id, billing_alert_days_before, billing_overdue_every_days, billing_overdue_max");
  const cfg = new Map<string, any>((wss ?? []).map((w: any) => [w.id, w]));

  // Cobranças em aberto, com dados do cliente.
  const { data: charges } = await sb.from("client_charges")
    .select("*, client:clients(name, phone)")
    .in("status", ["pendente", "vencido"]);

  let enviados = 0, pulados = 0, vencidasMarcadas = 0;

  for (const c of (charges ?? []) as any[]) {
    const w = cfg.get(c.workspace_id) ?? {};
    const alertDays: number[] = c.alert_days_before ?? w.billing_alert_days_before ?? [3, 1];
    const everyN: number = c.overdue_every_days ?? w.billing_overdue_every_days ?? 3;
    const maxN: number = c.overdue_max ?? w.billing_overdue_max ?? 5;

    const offset = daysUntil(c.due_date);
    let kind: string | null = null;
    let reference = "";

    if (offset > 0 && alertDays.includes(offset)) {
      kind = "lembrete"; reference = `D-${offset}`;
    } else if (offset === 0) {
      kind = "cobranca"; reference = "D0";
    } else if (offset < 0) {
      const daysLate = -offset;
      if (c.status === "pendente") {
        await sb.from("client_charges").update({ status: "vencido" }).eq("id", c.id);
        vencidasMarcadas++;
      }
      if (daysLate % everyN === 0) {
        const { count } = await sb.from("client_charge_events")
          .select("id", { count: "exact", head: true })
          .eq("charge_id", c.id).eq("kind", "atraso");
        if ((count ?? 0) < maxN) { kind = "atraso"; reference = `D+${daysLate}`; }
      }
    }

    if (!kind) { pulados++; continue; }

    // Dedupe: tenta registrar o evento; se já existe (UNIQUE), pula o envio.
    const { error: dupErr } = await sb.from("client_charge_events")
      .insert({ charge_id: c.id, kind, reference, status: "processing" });
    if (dupErr) { pulados++; continue; }

    const number = normalizeNumber(c.client?.phone ?? null);
    if (!number) {
      await sb.from("client_charge_events").update({ status: "skipped_no_phone" })
        .eq("charge_id", c.id).eq("kind", kind).eq("reference", reference);
      pulados++; continue;
    }

    const nome = c.client?.name ?? "Olá";
    const link = c.payment_link ? `\n\n💳 Pague aqui:\n${c.payment_link}` : "";
    let msg = "";
    if (kind === "lembrete") {
      msg = `Olá, ${nome}! 👋\n\nLembrete: a cobrança *${c.descricao}* de ${money(c.valor)} vence em ${brDate(c.due_date)} (${offset} dia${offset > 1 ? "s" : ""}).${link}`;
    } else if (kind === "cobranca") {
      msg = `Olá, ${nome}! 👋\n\nSua cobrança *${c.descricao}* de ${money(c.valor)} *vence hoje* (${brDate(c.due_date)}).${link}`;
    } else {
      msg = `Olá, ${nome}.\n\nA cobrança *${c.descricao}* de ${money(c.valor)} está *vencida* desde ${brDate(c.due_date)}. Por favor, regularize.${link}`;
    }

    const r = await sendWhatsapp(number, msg);
    await sb.from("client_charge_events").update({ status: r.ok ? "sent" : "error", detail: r.detail })
      .eq("charge_id", c.id).eq("kind", kind).eq("reference", reference);
    if (r.ok) enviados++; else pulados++;
  }

  return new Response(JSON.stringify({ ok: true, enviados, pulados, vencidasMarcadas }), {
    headers: { "Content-Type": "application/json" },
  });
});