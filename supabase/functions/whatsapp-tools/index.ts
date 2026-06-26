/**
 * whatsapp-tools
 *
 * Conjunto de "ferramentas" HTTP que a IA do agzap aciona via conectores
 * personalizados. Cada rota é uma operação no app (agenda / finanças).
 *
 * Auth: header `x-wa-token` -> tabela public.whatsapp_tokens -> workspace.
 * Roteamento: último segmento do path (ex: /whatsapp-tools/criar-compromisso).
 * Resposta: { ok, message, data? } — a IA do agzap repassa `message`.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wa-token",
};

const TZ = "America/Sao_Paulo";

// deno-lint-ignore no-explicit-any
type SB = ReturnType<typeof createClient<any>>;

const VALID_TIPOS_AGENDA = ["reuniao", "tarefa", "pessoal", "foco", "outro"];
const FREQ_VALIDAS = ["mensal", "trimestral", "semestral", "anual"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const ok = (message: string, data?: unknown) => json({ ok: true, message, data });
const fail = (message: string, status = 400) => json({ ok: false, message }, status);

/** Data de hoje em America/Sao_Paulo (YYYY-MM-DD). */
function today(): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  });
  return f.format(new Date());
}

/** Normaliza data: aceita YYYY-MM-DD, DD/MM/YYYY, "hoje", "amanha". */
function normDate(s?: string): string | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (t === "hoje") return today();
  if (t === "amanha" || t === "amanhã") {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return null;
}

/** Normaliza hora HH:MM (aceita "9", "9h", "09:30", "9:5"). */
function normTime(s?: string): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})(?:[:h](\d{1,2}))?/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mm = (m[2] ?? "00").padStart(2, "0");
  return `${hh}:${mm}`;
}

function money(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

/** Variável de template não preenchida pela IA (ex: "{{fim}}") -> tratar como vazia. */
function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^\{\{.*\}\}$/.test(s)) return null;
  return s;
}

async function readParams(req: Request): Promise<Record<string, string>> {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { const c = clean(v); if (c !== null) params[k] = c; });
  if (req.method !== "GET" && req.method !== "DELETE") {
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        for (const [k, v] of Object.entries(body)) {
          const c = clean(v);
          if (c !== null) params[k] = c;
        }
      }
    } catch { /* sem body json */ }
  }
  return params;
}

// =====================================================
// Ferramentas
// =====================================================

async function criarCompromisso(sb: SB, ownerId: string, p: Record<string, string>) {
  const date = normDate(p.data || p.date) || today();
  const start = normTime(p.inicio || p.start_time || p.hora);
  const end = normTime(p.fim || p.end_time);
  if (!start) return fail("Informe a hora de início (ex: 14:00).");
  const type = VALID_TIPOS_AGENDA.includes(p.tipo || "") ? p.tipo : "reuniao";
  const title = p.titulo || p.title || "Compromisso";

  const { data, error } = await sb.from("time_blocks").insert({
    user_id: ownerId,
    title,
    date,
    start_time: start,
    end_time: end ?? start,
    type,
    completed: false,
  }).select().single();
  if (error) return fail(`Erro ao criar: ${error.message}`);
  return ok(`✅ Compromisso "${title}" criado em ${date} às ${start}${end ? `–${end}` : ""}.`, { id: data.id });
}

async function consultarAgenda(sb: SB, ownerId: string, p: Record<string, string>) {
  const de = normDate(p.de || p.data || p.date) || today();
  const ate = normDate(p.ate) || de;
  const { data, error } = await sb.from("time_blocks")
    .select("id, title, date, start_time, end_time, type, completed")
    .eq("user_id", ownerId)
    .gte("date", de).lte("date", ate)
    .order("date").order("start_time");
  if (error) return fail(`Erro ao consultar: ${error.message}`);
  if (!data || data.length === 0) return ok(`📅 Nenhum compromisso entre ${de} e ${ate}.`, []);
  const linhas = data.map((b: any) =>
    `• ${b.date} ${b.start_time}${b.end_time ? `–${b.end_time}` : ""} — ${b.title}${b.completed ? " ✅" : ""} (id: ${b.id})`);
  return ok(`📅 Agenda (${de}${ate !== de ? ` a ${ate}` : ""}):\n${linhas.join("\n")}`, data);
}

async function atualizarCompromisso(sb: SB, ownerId: string, p: Record<string, string>) {
  if (!p.id) return fail("Informe o id do compromisso (consulte a agenda antes).");
  const upd: Record<string, unknown> = {};
  if (p.titulo || p.title) upd.title = p.titulo || p.title;
  const d = normDate(p.data || p.date); if (d) upd.date = d;
  const s = normTime(p.inicio || p.start_time); if (s) upd.start_time = s;
  const e = normTime(p.fim || p.end_time); if (e) upd.end_time = e;
  if (p.tipo && VALID_TIPOS_AGENDA.includes(p.tipo)) upd.type = p.tipo;
  if (p.concluido === "true" || p.concluido === "sim") upd.completed = true;
  if (Object.keys(upd).length === 0) return fail("Nada para atualizar.");
  const { data, error } = await sb.from("time_blocks")
    .update(upd).eq("id", p.id).eq("user_id", ownerId).select().single();
  if (error) return fail(`Erro ao atualizar: ${error.message}`);
  if (!data) return fail("Compromisso não encontrado.");
  return ok(`✏️ Compromisso "${data.title}" atualizado.`);
}

async function apagarCompromisso(sb: SB, ownerId: string, p: Record<string, string>) {
  if (!p.id) return fail("Informe o id do compromisso a apagar (consulte a agenda antes).");
  const { data, error } = await sb.from("time_blocks")
    .delete().eq("id", p.id).eq("user_id", ownerId).select().maybeSingle();
  if (error) return fail(`Erro ao apagar: ${error.message}`);
  if (!data) return fail("Compromisso não encontrado.");
  return ok(`🗑️ Compromisso "${data.title}" removido da agenda.`);
}

async function lancarCaixa(sb: SB, ws: string, ownerId: string, p: Record<string, string>) {
  const tipo = p.tipo === "saida" ? "saida" : "entrada";
  const valor = parseFloat((p.valor || p.value || "0").replace(",", "."));
  if (!valor || valor <= 0) return fail("Valor inválido.");
  const { error } = await sb.from("pj_caixa_transacoes").insert({
    workspace_id: ws,
    created_by: ownerId,
    tipo,
    descricao: p.descricao || p.description || "Lançamento via WhatsApp",
    valor,
    data: normDate(p.data) || today(),
    forma_pagamento: p.forma || p.forma_pagamento || null,
    observacoes: p.obs || p.observacoes || null,
  });
  if (error) return fail(`Erro ao lançar: ${error.message}`);
  return ok(`${tipo === "entrada" ? "📈 Entrada" : "📉 Saída"} de ${money(valor)} registrada no caixa.`);
}

async function consultarFinancas(sb: SB, ws: string, _p: Record<string, string>) {
  const hoje = today();
  const ini = `${hoje.slice(0, 7)}-01`;
  const { data: tx } = await sb.from("pj_caixa_transacoes")
    .select("tipo, valor").eq("workspace_id", ws).gte("data", ini).lte("data", hoje);
  let entradas = 0, saidas = 0;
  for (const t of (tx ?? []) as any[]) {
    if (t.tipo === "entrada") entradas += Number(t.valor); else saidas += Number(t.valor);
  }
  const { data: contas } = await sb.from("pj_contas_pagar")
    .select("valor, status").eq("workspace_id", ws).eq("status", "pendente");
  const pend = (contas ?? []) as any[];
  const totalPend = pend.reduce((s, c) => s + Number(c.valor), 0);
  const msg = [
    `💰 *Finanças do mês* (${hoje.slice(0, 7)})`,
    `📈 Entradas: ${money(entradas)}`,
    `📉 Saídas: ${money(saidas)}`,
    `🧮 Saldo: ${money(entradas - saidas)}`,
    `📌 Contas a pagar pendentes: ${pend.length} (${money(totalPend)})`,
  ].join("\n");
  return ok(msg, { entradas, saidas, saldo: entradas - saidas, contas_pendentes: pend.length });
}

async function criarContaPagar(sb: SB, ws: string, ownerId: string, p: Record<string, string>) {
  const valor = parseFloat((p.valor || p.value || "0").replace(",", "."));
  if (!valor || valor <= 0) return fail("Valor inválido.");
  const recorrente = p.recorrente === "true" || p.recorrente === "sim";
  const frequencia = FREQ_VALIDAS.includes(p.frequencia || "") ? p.frequencia : (recorrente ? "mensal" : null);
  const venc = normDate(p.vencimento || p.data_vencimento || p.data) || today();
  const { data, error } = await sb.from("pj_contas_pagar").insert({
    workspace_id: ws,
    created_by: ownerId,
    descricao: p.descricao || p.description || "Conta a pagar via WhatsApp",
    fornecedor: p.fornecedor || null,
    valor,
    data_vencimento: venc,
    status: "pendente",
    forma_pagamento: p.forma || p.forma_pagamento || null,
    recorrente,
    frequencia,
    observacoes: p.obs || p.observacoes || null,
  }).select().single();
  if (error) return fail(`Erro ao criar conta: ${error.message}`);
  const rec = recorrente ? ` (recorrente ${frequencia})` : "";
  return ok(`✅ Conta "${data.descricao}" de ${money(valor)} criada — vence ${venc}${rec}.`, { id: data.id });
}

async function listarContas(sb: SB, ws: string, _p: Record<string, string>) {
  const { data, error } = await sb.from("pj_contas_pagar")
    .select("id, descricao, fornecedor, valor, data_vencimento, status")
    .eq("workspace_id", ws).eq("status", "pendente")
    .order("data_vencimento");
  if (error) return fail(`Erro ao listar: ${error.message}`);
  if (!data || data.length === 0) return ok("✅ Nenhuma conta pendente.", []);
  const linhas = (data as any[]).map(c =>
    `• ${c.descricao}${c.fornecedor ? ` (${c.fornecedor})` : ""} — ${money(Number(c.valor))} vence ${c.data_vencimento} (id: ${c.id})`);
  return ok(`📌 Contas a pagar pendentes:\n${linhas.join("\n")}`, data);
}

async function pagarConta(sb: SB, ws: string, p: Record<string, string>) {
  if (!p.id) return fail("Informe o id da conta (use listar-contas antes).");
  const { data, error } = await sb.from("pj_contas_pagar")
    .update({ status: "pago", data_pagamento: normDate(p.data) || today(),
      ...(p.forma || p.forma_pagamento ? { forma_pagamento: p.forma || p.forma_pagamento } : {}) })
    .eq("id", p.id).eq("workspace_id", ws).select().maybeSingle();
  if (error) return fail(`Erro ao pagar: ${error.message}`);
  if (!data) return fail("Conta não encontrada.");
  return ok(`💸 Conta "${data.descricao}" marcada como paga.`);
}

// =====================================================
// Handler
// =====================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) Autenticação por token -> workspace + dono.
    const token = req.headers.get("x-wa-token");
    if (!token) return fail("Token ausente.", 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tk } = await sb.from("whatsapp_tokens")
      .select("workspace_id, is_active").eq("token", token).maybeSingle();
    if (!tk || tk.is_active === false) return fail("Token inválido.", 401);
    const ws = tk.workspace_id as string;

    const { data: wsRow } = await sb.from("workspaces")
      .select("owner_user_id").eq("id", ws).maybeSingle();
    const ownerId = wsRow?.owner_user_id as string;
    if (!ownerId) return fail("Workspace sem dono.", 400);

    // 2) Roteamento por último segmento do path.
    const tool = new URL(req.url).pathname.split("/").filter(Boolean).pop();
    const p = await readParams(req);

    switch (tool) {
      case "criar-compromisso":     return await criarCompromisso(sb, ownerId, p);
      case "consultar-agenda":      return await consultarAgenda(sb, ownerId, p);
      case "atualizar-compromisso": return await atualizarCompromisso(sb, ownerId, p);
      case "apagar-compromisso":    return await apagarCompromisso(sb, ownerId, p);
      case "lancar-caixa":          return await lancarCaixa(sb, ws, ownerId, p);
      case "consultar-financas":    return await consultarFinancas(sb, ws, p);
      case "criar-conta-pagar":     return await criarContaPagar(sb, ws, ownerId, p);
      case "listar-contas":         return await listarContas(sb, ws, p);
      case "pagar-conta":           return await pagarConta(sb, ws, p);
      default:                      return fail(`Ferramenta desconhecida: ${tool}`, 404);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500);
  }
});