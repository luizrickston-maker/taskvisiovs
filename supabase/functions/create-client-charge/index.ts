/**
 * create-client-charge
 *
 * Cria uma cobrança de cliente e gera o link de pagamento no InfinitePay.
 * Chamada pelo app (usuário autenticado). Valida o acesso ao workspace,
 * insere em client_charges e chama POST /links do InfinitePay com:
 *   - handle (InfiniteTag do workspace)
 *   - items[] (valor em CENTAVOS)
 *   - order_nsu = id da cobrança (chave de reconciliação)
 *   - webhook_url = infinitepay-webhook?k=SECRET (para baixa automática)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INFINITEPAY_WEBHOOK_SECRET.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFINITEPAY_LINKS_URL = "https://api.checkout.infinitepay.io/links";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Tenta extrair a URL do link da resposta do InfinitePay (formato não fixo na doc). */
function extractLink(data: unknown): string | null {
  if (typeof data === "string" && data.startsWith("http")) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const k of ["url", "link", "payment_url", "checkout_url", "redirect_url"]) {
      if (typeof o[k] === "string") return o[k] as string;
    }
    if (o.data) return extractLink(o.data);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Autenticação do chamador (app).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Sessão inválida" }, 401);

    const body = await req.json();
    const { client_id, descricao, valor, due_date, recorrente, frequencia,
      alert_days_before, overdue_every_days, overdue_max } = body;

    if (!client_id || !valor || !due_date) {
      return json({ error: "client_id, valor e due_date são obrigatórios" }, 400);
    }
    const valorNum = Number(valor);
    if (!valorNum || valorNum <= 0) return json({ error: "valor inválido" }, 400);

    // 2) Resolve o cliente + workspace e valida acesso.
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, email, phone, workspace_id")
      .eq("id", client_id)
      .maybeSingle();
    if (!client) return json({ error: "cliente não encontrado" }, 404);

    const { data: access } = await supabase.rpc("has_workspace_access", {
      _workspace_id: client.workspace_id,
    }).then((r) => r, () => ({ data: null }));
    // Fallback de validação: confirma que o usuário pertence ao workspace.
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", client.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: wsOwner } = await supabase
      .from("workspaces")
      .select("owner_user_id, billing_handle")
      .eq("id", client.workspace_id)
      .maybeSingle();
    const allowed = access === true || !!member || wsOwner?.owner_user_id === user.id;
    if (!allowed) return json({ error: "acesso negado ao workspace" }, 403);

    const handle = wsOwner?.billing_handle as string | undefined;
    if (!handle) {
      return json({ error: "Handle do InfinitePay não configurado (workspaces.billing_handle)" }, 400);
    }

    // 3) Cria a cobrança (status pendente).
    const { data: charge, error: insErr } = await supabase
      .from("client_charges")
      .insert({
        workspace_id: client.workspace_id,
        client_id,
        descricao: descricao || "Cobrança",
        valor: valorNum,
        due_date,
        recorrente: recorrente === true,
        frequencia: recorrente ? (frequencia || "mensal") : null,
        alert_days_before: alert_days_before ?? null,
        overdue_every_days: overdue_every_days ?? null,
        overdue_max: overdue_max ?? null,
        external_ref: null,
        created_by: user.id,
      })
      .select()
      .single();
    if (insErr) return json({ error: `Erro ao criar cobrança: ${insErr.message}` }, 500);

    // 4) Gera o link no InfinitePay.
    const secret = Deno.env.get("INFINITEPAY_WEBHOOK_SECRET") ?? "";
    const webhookUrl =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay-webhook?k=${secret}`;

    const payload = {
      handle,
      items: [{
        quantity: 1,
        price: Math.round(valorNum * 100), // CENTAVOS
        description: (descricao || "Cobrança").slice(0, 120),
      }],
      order_nsu: charge.id,
      webhook_url: webhookUrl,
      ...(client.name || client.email || client.phone
        ? { customer: {
            name: client.name ?? undefined,
            email: client.email ?? undefined,
            phone_number: client.phone ?? undefined,
          } }
        : {}),
    };

    const resp = await fetch(INFINITEPAY_LINKS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const respText = await resp.text();
    let respData: unknown = respText;
    try { respData = JSON.parse(respText); } catch { /* texto puro */ }

    if (!resp.ok) {
      await supabase.from("client_charge_events").insert({
        charge_id: charge.id, kind: "link_criado", reference: "criacao",
        status: "error", detail: `infinitepay_${resp.status}: ${respText.slice(0, 300)}`,
      });
      return json({ error: "Falha ao gerar link InfinitePay", status: resp.status,
        body: respText.slice(0, 500), charge_id: charge.id }, 502);
    }

    const link = extractLink(respData);
    const slug = (respData as any)?.slug ?? (respData as any)?.invoice_slug ?? null;

    await supabase.from("client_charges")
      .update({ payment_link: link, invoice_slug: slug, external_ref: charge.id })
      .eq("id", charge.id);

    await supabase.from("client_charge_events").insert({
      charge_id: charge.id, kind: "link_criado", reference: "criacao",
      status: "ok", detail: link ?? respText.slice(0, 300),
    });

    return json({ ok: true, charge_id: charge.id, payment_link: link, raw: respData });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});