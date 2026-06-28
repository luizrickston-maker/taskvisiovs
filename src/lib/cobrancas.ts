import { supabase } from '@/integrations/supabase/client';

export interface ClientCharge {
  id: string;
  workspace_id: string;
  client_id: string;
  descricao: string;
  valor: number;
  due_date: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  recorrente: boolean;
  frequencia: string | null;
  payment_link: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  receipt_url: string | null;
  created_at: string;
}

export const STATUS_META: Record<ClientCharge['status'], { label: string; className: string }> = {
  pendente:  { label: 'Pendente',  className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  pago:      { label: 'Pago',      className: 'bg-green-500/15 text-green-600 border-green-500/30' },
  vencido:   { label: 'Vencido',   className: 'bg-red-500/15 text-red-600 border-red-500/30' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground border-border' },
};

export const FREQ_LABELS: Record<string, string> = {
  mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
};

export function money(v: number | null | undefined): string {
  return `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
}

export function formatBRDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** Categoria "Recebimentos de Clientes" (cria sob demanda). */
async function getRecebimentosCategoria(workspaceId: string): Promise<string | null> {
  const { data } = await supabase.from('pj_caixa_categorias')
    .select('id').eq('workspace_id', workspaceId).eq('nome', 'Recebimentos de Clientes').maybeSingle();
  if (data?.id) return data.id;
  const { data: novo } = await supabase.from('pj_caixa_categorias')
    .insert({ workspace_id: workspaceId, nome: 'Recebimentos de Clientes', tipo: 'entrada', cor: '#22c55e' })
    .select('id').single();
  return novo?.id ?? null;
}

/**
 * Marca uma cobrança como paga MANUALMENTE (pagamento fora do InfinitePay) e
 * lança a entrada no caixa, mantendo a consistência financeira.
 */
export async function marcarCobrancaPaga(charge: ClientCharge, clientName?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const categoriaId = await getRecebimentosCategoria(charge.workspace_id);

  const { data: tx } = await supabase.from('pj_caixa_transacoes').insert({
    workspace_id: charge.workspace_id,
    created_by: user?.id,
    tipo: 'entrada',
    descricao: `Recebimento — ${clientName ?? 'Cliente'} — ${charge.descricao}`,
    valor: charge.valor,
    data: todayISO(),
    categoria_id: categoriaId,
    observacoes: 'Baixa manual de cobrança',
    referencia: charge.id,
  }).select('id').single();

  await supabase.from('client_charges').update({
    status: 'pago',
    paid_at: new Date().toISOString(),
    paid_amount: charge.valor,
    caixa_transacao_id: tx?.id ?? null,
  }).eq('id', charge.id);
}

export async function cancelarCobranca(id: string): Promise<void> {
  await supabase.from('client_charges').update({ status: 'cancelado' }).eq('id', id);
}

/** Cria cobrança + gera link InfinitePay via Edge Function. */
export async function criarCobranca(input: {
  client_id: string; descricao: string; valor: number; due_date: string;
  recorrente?: boolean; frequencia?: string;
}): Promise<{ payment_link: string | null }> {
  const { data, error } = await supabase.functions.invoke('create-client-charge', { body: input });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { payment_link: data?.payment_link ?? null };
}

/** Envia a cobrança/lembrete AGORA para o WhatsApp do cliente (fora da cadência). */
export async function enviarCobrancaAgora(chargeId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-charge-now', { body: { charge_id: chargeId } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}