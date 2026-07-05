/**
 * infinitepay-webhook
 *
 * Recebe a confirmação de pagamento do InfinitePay (configurado por link via
 * webhook_url=...?k=SECRET). Ao confirmar:
 *   1. valida o secret da URL + confere via payment_check (anti-fraude)
 *   2. dá baixa na cobrança (status pago, paid_amount, receipt_url)
 *   3. lança ENTRADA no caixa (categoria "Recebimentos de Clientes")
 *   4. registra o evento (para o agendador parar de cobrar)
 *   5. se recorrente, gera a próxima cobrança + novo link
 *
 * Responde rápido (200/400). 400 faz o InfinitePay reenviar.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INFINITEPAY_WEBHOOK_SECRET,
 *      INFINITEPAY_SKIP_CHECK ("true" só para testes).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };
const PAYMENT_CHECK_URL = "https://api.checkout.infinitepay.io/payment_check";
const LINKS_URL = "https://api.checkout.infinitepay.io/links";

// deno-lint-ignore no-explicit-any
type SB = ReturnType<typeof createClient<any>>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AGZAP_URL = "https://app.agzap.com.br/send";
const MESES: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

function money(v: number) { return `R$ ${Number(v).toFixed(2).replace(".", ",")}`; }

function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}

/** Envia WhatsApp via agzap (best-effort: não quebra o webhook se falhar). */
async function sendWhatsapp(number: string, message: string): Promise<void> {
  const token = Deno.env.get("AGZAP_TOKEN");
  if (!token) return;
  try {
    await fetch(AGZAP_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, number, type: "text", message }),
    });
  } catch { /* não bloqueia a reconciliação */ }
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** Categoria "Recebimentos de Clientes" (cria sob demanda). */
async function getCategoriaRecebimentos(sb: SB, ws: string): Promise<string | null> {
  const { data } = await sb.from("pj_caixa_categorias")
    .select("id").eq("workspace_id", ws).eq("nome", "Recebimentos de Clientes").maybeSingle();
  if (data?.id) return data.id;
  const { data: novo } = await sb.from("pj_caixa_categorias")
    .insert({ workspace_id: ws, nome: "Recebimentos de Clientes", tipo: "entrada", cor: "#22c55e" })
    .select("id").single();
  return novo?.id ?? null;
}

/** Encurta a URL via portal_short_links (validade 1 ano). Fallback: URL original. */
function shortCode(len = 8): string {
  const cs = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const v = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(v, (x) => cs[x % cs.length]).join("");
}
async function shorten(sb: SB, longUrl: string | null): Promise<string | null> {
  const site = Deno.env.get("SITE_URL");
  if (!site || !longUrl) return longUrl;
  const code = shortCode();
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  const { error } = await sb.from("portal_short_links")
    .insert({ code, target_url: longUrl, expires_at: expires });
  if (error) return longUrl;
  return `${site.replace(/\/$/, "")}/p/${code}`;
}

/** Gera link InfinitePay para a próxima cobrança recorrente. */
async function gerarLink(handle: string, valor: number, descricao: string, orderNsu: string,
  webhookUrl: string, customer: Record<string, unknown> | null): Promise<{ link: string | null; slug: string | null }> {
  const resp = await fetch(LINKS_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle,
      items: [{ quantity: 1, price: Math.round(valor * 100), description: descricao.slice(0, 120) }],
      order_nsu: orderNsu, webhook_url: webhookUrl,
      ...(customer ? { customer } : {}),
    }),
  });
  if (!resp.ok) return { link: null, slug: null };
  const d = await resp.json().catch(() => null);
  const link = d?.url ?? d?.link ?? d?.data?.url ?? null;
  return { link, slug: d?.slug ?? d?.invoice_slug ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // 1) Secret da URL.
  const url = new URL(req.url);
  const secret = url.searchParams.get("k");
  if (!secret || secret !== Deno.env.get("INFINITEPAY_WEBHOOK_SECRET")) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const orderNsu = body.order_nsu;
    if (!orderNsu) return json({ error: "order_nsu ausente" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 2) Acha a cobrança (order_nsu = id da cobrança).
    const { data: charge } = await sb.from("client_charges")
      .select("*").eq("id", orderNsu).maybeSingle();
    if (!charge) return json({ ignored: "cobranca_nao_encontrada" }); // 200: não reenviar
    if (charge.status === "pago") return json({ ok: true, already: true }); // idempotente

    // Handle do workspace.
    const { data: ws } = await sb.from("workspaces")
      .select("billing_handle, notify_whatsapp").eq("id", charge.workspace_id).maybeSingle();
    const handle = ws?.billing_handle as string | undefined;

    // 3) Confirma via payment_check (anti-fraude), salvo flag de teste.
    if (Deno.env.get("INFINITEPAY_SKIP_CHECK") !== "true" && handle) {
      const chk = await fetch(PAYMENT_CHECK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle, order_nsu: orderNsu,
          transaction_nsu: body.transaction_nsu, slug: body.invoice_slug,
        }),
      }).then((r) => r.json()).catch(() => null);
      if (chk && chk.success === true && chk.paid === false) {
        return json({ error: "pagamento_nao_confirmado" }, 400); // reenvia depois
      }
    }

    const paidAmount = body.paid_amount ? Number(body.paid_amount) / 100 : Number(charge.valor);

    // 4) Baixa na cobrança.
    await sb.from("client_charges").update({
      status: "pago", paid_at: new Date().toISOString(),
      paid_amount: paidAmount, receipt_url: body.receipt_url ?? null,
      invoice_slug: body.invoice_slug ?? charge.invoice_slug,
    }).eq("id", charge.id);

    // 5) Entrada no caixa.
    const { data: cliente } = await sb.from("clients")
      .select("name, email, phone").eq("id", charge.client_id).maybeSingle();
    const categoriaId = await getCategoriaRecebimentos(sb, charge.workspace_id);
    const { data: tx } = await sb.from("pj_caixa_transacoes").insert({
      workspace_id: charge.workspace_id,
      created_by: charge.created_by,
      tipo: "entrada",
      descricao: `Recebimento — ${cliente?.name ?? "Cliente"} — ${charge.descricao}`,
      valor: paidAmount,
      data: today(),
      categoria_id: categoriaId,
      forma_pagamento: body.capture_method === "pix" ? "pix" : (body.capture_method === "credit_card" ? "cartao_credito" : null),
      observacoes: "Pago via InfinitePay (cobrança automática)",
      referencia: charge.id,
    }).select("id").single();

    if (tx?.id) await sb.from("client_charges").update({ caixa_transacao_id: tx.id }).eq("id", charge.id);

    // 5.1) Rateio (metodologia de gestão): divide o valor recebido em fatias por
    //      destino, conforme a regra do workspace. Só para pagamentos de cliente.
    const { data: rules } = await sb.from("caixa_allocation_rules")
      .select("label, percent, destino, sort").eq("workspace_id", charge.workspace_id)
      .eq("is_active", true).order("sort", { ascending: true });
    const activeRules = (rules ?? []) as any[];
    if (activeRules.length > 0) {
      let acumulado = 0;
      const linhas = activeRules.map((r, i) => {
        let valor: number;
        if (i === activeRules.length - 1) {
          valor = Math.round((paidAmount - acumulado) * 100) / 100; // última fatia = resto (fecha 100%)
        } else {
          valor = Math.round(paidAmount * Number(r.percent)) / 100;
          acumulado += valor;
        }
        return {
          workspace_id: charge.workspace_id,
          charge_id: charge.id,
          source_transacao_id: tx?.id ?? null,
          label: r.label, destino: r.destino, valor,
        };
      });
      await sb.from("caixa_allocations").insert(linhas);
    }

    // 6) Log.
    await sb.from("client_charge_events").insert({
      charge_id: charge.id, kind: "pago", reference: "webhook",
      status: "ok", detail: `${paidAmount} via ${body.capture_method ?? "?"}`,
    });

    // 6.1) Notifica os destinatários do tipo "financeiro" que o cliente pagou
    //      (fallback ao número legado notify_whatsapp).
    const { data: recps } = await sb.from("notification_recipients")
      .select("whatsapp").eq("workspace_id", charge.workspace_id).eq("is_active", true)
      .contains("types", ["financeiro"]);
    let gestores = ((recps ?? []) as any[])
      .map((r) => normalizeNumber(r.whatsapp)).filter((n): n is string => !!n);
    if (gestores.length === 0) {
      const n = normalizeNumber(ws?.notify_whatsapp ?? null);
      if (n) gestores = [n];
    }
    if (gestores.length > 0) {
      const forma = body.capture_method === "pix" ? "PIX"
        : body.capture_method === "credit_card" ? "Cartão de crédito" : "—";
      const msg = [
        "💰 *Pagamento recebido!*",
        "",
        `👤 Cliente: ${cliente?.name ?? "Cliente"}`,
        `📋 ${charge.descricao}`,
        `💵 Valor: ${money(paidAmount)}`,
        `💳 Forma: ${forma}`,
        ...(body.receipt_url ? ["", `🧾 Comprovante: ${body.receipt_url}`] : []),
      ].join("\n");
      for (const g of gestores) await sendWhatsapp(g, msg);
    }

    // 7) Próxima cobrança se recorrente.
    if (charge.recorrente && handle) {
      const meses = MESES[charge.frequencia as string] ?? 1;
      const nextDue = addMonths(charge.due_date, meses);
      const { data: prox } = await sb.from("client_charges").insert({
        workspace_id: charge.workspace_id, client_id: charge.client_id,
        descricao: charge.descricao, valor: charge.valor, due_date: nextDue,
        recorrente: true, frequencia: charge.frequencia,
        alert_days_before: charge.alert_days_before,
        overdue_every_days: charge.overdue_every_days, overdue_max: charge.overdue_max,
        created_by: charge.created_by,
      }).select().single();
      if (prox) {
        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook?k=${secret}`;
        const customer = cliente ? {
          name: cliente.name ?? undefined, email: cliente.email ?? undefined,
          phone_number: cliente.phone ?? undefined,
        } : null;
        const { link, slug } = await gerarLink(handle, Number(charge.valor), charge.descricao, prox.id, webhookUrl, customer);
        const shortLink = await shorten(sb, link);
        await sb.from("client_charges").update({ payment_link: shortLink, invoice_slug: slug, external_ref: prox.id }).eq("id", prox.id);
      }
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});