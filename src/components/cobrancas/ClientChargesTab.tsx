import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, ExternalLink, Check, Ban, Repeat, Loader2, Send, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ClientCharge, STATUS_META, FREQ_LABELS, money, formatBRDate,
  criarCobranca, marcarCobrancaPaga, cancelarCobranca, enviarCobrancaAgora,
} from '@/lib/cobrancas';

interface Props {
  clientId: string;
  clientName?: string;
}

export function ClientChargesTab({ clientId, clientName }: Props) {
  const [charges, setCharges] = useState<ClientCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('mensal');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('client_charges')
      .select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setCharges((data ?? []) as ClientCharge[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId]);

  const handleCreate = async () => {
    const v = parseFloat(valor.replace(',', '.'));
    if (!descricao.trim() || !v || v <= 0 || !dueDate) {
      toast.error('Preencha descrição, valor e vencimento.');
      return;
    }
    setCreating(true);
    try {
      const { payment_link } = await criarCobranca({
        client_id: clientId, descricao: descricao.trim(), valor: v, due_date: dueDate,
        recorrente, frequencia: recorrente ? frequencia : undefined,
      });
      toast.success('Cobrança criada!', {
        description: payment_link ? 'Link de pagamento gerado.' : 'Sem link (verifique o handle InfinitePay).',
        action: payment_link ? { label: 'Copiar link', onClick: () => copy(payment_link) } : undefined,
      });
      setDescricao(''); setValor(''); setDueDate(''); setRecorrente(false);
      load();
    } catch (e: any) {
      toast.error(`Erro ao criar cobrança: ${e?.message ?? 'tente novamente'}`);
    } finally {
      setCreating(false);
    }
  };

  const copy = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handlePagar = async (c: ClientCharge) => {
    setBusy(c.id);
    try { await marcarCobrancaPaga(c, clientName); toast.success('Cobrança baixada e lançada no caixa.'); load(); }
    catch { toast.error('Erro ao marcar como paga.'); }
    finally { setBusy(null); }
  };

  const handleCancelar = async (c: ClientCharge) => {
    setBusy(c.id);
    try { await cancelarCobranca(c.id); toast.success('Cobrança cancelada.'); load(); }
    catch { toast.error('Erro ao cancelar.'); }
    finally { setBusy(null); }
  };

  const handleEnviar = async (c: ClientCharge) => {
    setBusy(c.id);
    try { await enviarCobrancaAgora(c.id); toast.success('Mensagem enviada ao cliente no WhatsApp!'); }
    catch (e: any) { toast.error(`Não foi possível enviar: ${e?.message ?? 'tente novamente'}`); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {/* Como funciona */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2.5 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p><strong className="text-foreground">Como funciona:</strong> ao criar uma cobrança, geramos um link de pagamento (InfinitePay) e o cliente recebe avisos automáticos no WhatsApp.</p>
          <p>📅 <strong className="text-foreground">Lembretes:</strong> 3 e 1 dia antes do vencimento • 💰 <strong className="text-foreground">no dia</strong> do vencimento • ⚠️ <strong className="text-foreground">atraso</strong> a cada 3 dias (até 5x).</p>
          <p>✅ Quando o cliente paga, a baixa é automática (entra no caixa e você é avisado). Use <strong className="text-foreground">"Enviar agora"</strong> para mandar a cobrança na hora, fora da cadência.</p>
        </div>
      </div>

      {/* Nova cobrança */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Cobrança</CardTitle>
          <CardDescription>Gera um link de pagamento e dispara os lembretes automáticos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="cob-desc">Descrição</Label>
              <Input id="cob-desc" value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Mensalidade de gestão — Julho" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cob-valor">Valor (R$)</Label>
              <Input id="cob-valor" type="number" step="0.01" min="0.01" value={valor}
                onChange={e => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cob-venc">Vencimento</Label>
              <Input id="cob-venc" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={recorrente} onCheckedChange={setRecorrente} id="cob-rec" />
              <Label htmlFor="cob-rec" className="cursor-pointer flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5" /> Recorrente
              </Label>
            </div>
            {recorrente && (
              <Select value={frequencia} onValueChange={setFrequencia}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQ_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleCreate} disabled={creating} className="ml-auto">
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              {creating ? 'Criando…' : 'Criar cobrança'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cobranças</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : charges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cobrança ainda.</p>
          ) : (
            <div className="space-y-3">
              {charges.map(c => {
                const meta = STATUS_META[c.status];
                const aberta = c.status === 'pendente' || c.status === 'vencido';
                return (
                  <div key={c.id} className="rounded-lg border border-border p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {money(c.valor)} • vence {formatBRDate(c.due_date)}
                          {c.recorrente && ` • ${FREQ_LABELS[c.frequencia ?? 'mensal']}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.payment_link && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => copy(c.payment_link!)}>
                            <Copy className="w-3.5 h-3.5" /> Copiar link
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                            <a href={c.payment_link} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" /> Abrir
                            </a>
                          </Button>
                        </>
                      )}
                      {aberta && (
                        <>
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-primary hover:text-primary"
                            disabled={busy === c.id} onClick={() => handleEnviar(c)}>
                            {busy === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar agora
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-green-600 hover:text-green-700"
                            disabled={busy === c.id} onClick={() => handlePagar(c)}>
                            <Check className="w-3.5 h-3.5" /> Marcar paga
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                            disabled={busy === c.id} onClick={() => handleCancelar(c)}>
                            <Ban className="w-3.5 h-3.5" /> Cancelar
                          </Button>
                        </>
                      )}
                      {c.receipt_url && (
                        <Button size="sm" variant="ghost" className="h-8 gap-1.5" asChild>
                          <a href={c.receipt_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" /> Comprovante
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}