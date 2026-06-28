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

const MESES: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

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
      .select("billing_handle").eq("id", charge.workspace_id).maybeSingle();
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

    // 6) Log.
    await sb.from("client_charge_events").insert({
      charge_id: charge.id, kind: "pago", reference: "webhook",
      status: "ok", detail: `${paidAmount} via ${body.capture_method ?? "?"}`,
    });

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
        await sb.from("client_charges").update({ payment_link: link, invoice_slug: slug, external_ref: prox.id }).eq("id", prox.id);
      }
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});