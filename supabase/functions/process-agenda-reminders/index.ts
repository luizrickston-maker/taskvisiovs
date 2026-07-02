/**
 * process-agenda-reminders
 *
 * Rodada frequente (via pg_cron, a cada ~15 min em horário útil) que lembra o
 * gestor dos seus compromissos (time_blocks) conforme a cadência configurada:
 *   - dias antes  (agenda_remind_days_before, ex: {1})  -> aviso pela manhã
 *   - horas antes (agenda_remind_hours_before, ex: {2}) -> aviso N horas antes
 *
 * Idempotente: cada (compromisso, referência) fica em agenda_reminder_events
 * com UNIQUE — nunca envia o mesmo lembrete 2x.
 *
 * Auth: header x-notify-secret == NOTIFY_SECRET.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOTIFY_SECRET, AGZAP_TOKEN.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AGZAP_URL = "https://app.agzap.com.br/send";
const TZ = "America/Sao_Paulo";

// deno-lint-ignore no-explicit-any
type SB = ReturnType<typeof createClient<any>>;

function todayBRT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}
function hourBRT(): number {
  return parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()), 10);
}
function daysUntil(date: string): number {
  const a = new Date(`${date}T12:00:00-03:00`).getTime();
  const b = new Date(`${todayBRT()}T12:00:00-03:00`).getTime();
  return Math.round((a - b) / 86400000);
}
function apptMs(date: string, start: string | null): number {
  return new Date(`${date}T${(start ?? "00:00")}:00-03:00`).getTime();
}
function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}
function brDate(iso: string) { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

async function sendWhatsapp(number: string, message: string): Promise<boolean> {
  const token = Deno.env.get("AGZAP_TOKEN");
  if (!token) return false;
  const r = await fetch(AGZAP_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, number, type: "text", message }),
  });
  return r.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);
  const secret = req.headers.get("x-notify-secret");
  if (!secret || secret !== Deno.env.get("NOTIFY_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const sb: SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Workspaces: config + dono (para mapear time_blocks.user_id -> workspace).
  const { data: wss } = await sb.from("workspaces")
    .select("id, owner_user_id, agenda_remind_days_before, agenda_remind_hours_before");
  const byOwner = new Map<string, any>((wss ?? []).map((w: any) => [w.owner_user_id, w]));

  // Destinatários do tipo 'agenda' por workspace.
  const { data: recps } = await sb.from("notification_recipients")
    .select("workspace_id, whatsapp").eq("is_active", true).contains("types", ["agenda"]);
  const recipientsByWs = new Map<string, string[]>();
  for (const r of (recps ?? []) as any[]) {
    const n = normalizeNumber(r.whatsapp);
    if (!n) continue;
    const arr = recipientsByWs.get(r.workspace_id) ?? [];
    arr.push(n); recipientsByWs.set(r.workspace_id, arr);
  }

  // Compromissos de hoje em diante, não concluídos.
  const { data: blocks } = await sb.from("time_blocks")
    .select("id, title, date, start_time, user_id")
    .gte("date", todayBRT())
    .eq("completed", false);

  const now = Date.now();
  const hora = hourBRT();
  let enviados = 0;

  for (const b of (blocks ?? []) as any[]) {
    const ws = byOwner.get(b.user_id);
    if (!ws) continue;
    const numbers = recipientsByWs.get(ws.id) ?? [];
    if (numbers.length === 0) continue;

    const daysCfg: number[] = ws.agenda_remind_days_before ?? [];
    const hoursCfg: number[] = ws.agenda_remind_hours_before ?? [];

    // Referências devidas neste tick.
    const due: { ref: string; msg: string }[] = [];
    const dU = daysUntil(b.date);
    const start = b.start_time ?? "";

    // Dias antes: dispara pela manhã (>= 08h) do dia-alvo.
    for (const D of daysCfg) {
      if (dU === D && hora >= 8) {
        const quando = D === 0 ? "Hoje" : D === 1 ? "Amanhã" : `Em ${D} dias (${brDate(b.date)})`;
        due.push({ ref: `day-${D}`, msg: `📅 *Lembrete de compromisso*\n\n${quando}${start ? ` às ${start}` : ""}\n📌 ${b.title}` });
      }
    }
    // Horas antes: dispara quando faltam H horas (e o compromisso ainda não começou).
    const startMs = apptMs(b.date, b.start_time);
    for (const H of hoursCfg) {
      const target = startMs - H * 3600 * 1000;
      if (now >= target && now < startMs) {
        due.push({ ref: `hour-${H}`, msg: `⏰ *Compromisso em ~${H}h*\n\n${start ? `${start} — ` : ""}${b.title}` });
      }
    }

    for (const d of due) {
      // Dedupe: registra a intenção; se já existe (UNIQUE), pula.
      const { error: dup } = await sb.from("agenda_reminder_events")
        .insert({ time_block_id: b.id, reference: d.ref, status: "processing" });
      if (dup) continue;

      let ok = false;
      for (const number of numbers) { if (await sendWhatsapp(number, d.msg)) ok = true; }
      await sb.from("agenda_reminder_events")
        .update({ status: ok ? "sent" : "error" })
        .eq("time_block_id", b.id).eq("reference", d.ref);
      if (ok) enviados++;
    }
  }

  return new Response(JSON.stringify({ ok: true, enviados }), { headers: { "Content-Type": "application/json" } });
});