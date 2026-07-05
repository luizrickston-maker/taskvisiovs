import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Check, PiggyBank, Save, Info, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { money } from '@/lib/cobrancas';

interface Rule { id?: string; label: string; percent: number; destino: string; sort: number; }
interface Allocation {
  id: string; label: string; destino: string; valor: number;
  transferido: boolean; transferido_at: string | null; created_at: string;
}

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesLabel = (ym: string) => { const [y, m] = ym.split('-'); return `${MESES[parseInt(m, 10)]} ${y}`; };

export function DistribuicaoTab() {
  const [wsId, setWsId] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [allocs, setAllocs] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (id: string) => {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from('caixa_allocation_rules').select('id, label, percent, destino, sort')
        .eq('workspace_id', id).order('sort', { ascending: true }),
      supabase.from('caixa_allocations')
        .select('id, label, destino, valor, transferido, transferido_at, created_at')
        .eq('workspace_id', id).order('created_at', { ascending: false }),
    ]);
    setRules((r ?? []).map((x: any) => ({ ...x, percent: Number(x.percent) })));
    setAllocs((a ?? []) as Allocation[]);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: id } = await supabase.rpc('get_my_workspace_id');
      if (!id) { setLoading(false); return; }
      setWsId(id as string);
      load(id as string);
    })();
  }, []);

  const somaPct = useMemo(() => rules.reduce((s, r) => s + (Number(r.percent) || 0), 0), [rules]);

  const setRule = (i: number, patch: Partial<Rule>) =>
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const addRule = () => setRules(prev => [...prev, { label: '', percent: 0, destino: '', sort: prev.length + 1 }]);
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i));

  const saveRules = async () => {
    if (!wsId) return;
    if (Math.round(somaPct) !== 100) { toast.error('A soma dos percentuais precisa ser 100%.'); return; }
    if (rules.some(r => !r.label.trim() || !r.destino.trim())) { toast.error('Preencha nome e destino de cada fatia.'); return; }
    setSavingRules(true);
    // Substitui o conjunto de regras (simples e previsível).
    const del = await supabase.from('caixa_allocation_rules').delete().eq('workspace_id', wsId);
    if (del.error) { setSavingRules(false); toast.error('Erro ao salvar regra.'); return; }
    const rows = rules.map((r, i) => ({
      workspace_id: wsId, label: r.label.trim(), percent: Number(r.percent),
      destino: r.destino.trim(), sort: i + 1,
    }));
    const ins = await supabase.from('caixa_allocation_rules').insert(rows);
    setSavingRules(false);
    if (ins.error) { toast.error('Erro ao salvar regra.'); return; }
    toast.success('Regra de rateio atualizada!');
    load(wsId);
  };

  const marcarTransferido = async (ids: string[]) => {
    setBusy(ids[0]);
    const { error } = await supabase.from('caixa_allocations')
      .update({ transferido: true, transferido_at: new Date().toISOString() }).in('id', ids);
    setBusy(null);
    if (error) { toast.error('Erro ao marcar.'); return; }
    setAllocs(prev => prev.map(a => ids.includes(a.id) ? { ...a, transferido: true } : a));
    toast.success('Marcado como transferido.');
  };

  // Agrupa pendentes por destino.
  const pendentes = allocs.filter(a => !a.transferido);
  const porDestino = useMemo(() => {
    const m = new Map<string, { total: number; items: Allocation[] }>();
    for (const a of pendentes) {
      const g = m.get(a.destino) ?? { total: 0, items: [] };
      g.total += Number(a.valor); g.items.push(a); m.set(a.destino, g);
    }
    return Array.from(m.entries());
  }, [pendentes]);

  // Histórico do que já foi transferido, agrupado por mês -> destino.
  const historico = useMemo(() => {
    const byMonth = new Map<string, { total: number; destinos: Map<string, number> }>();
    for (const a of allocs.filter(x => x.transferido)) {
      const key = (a.transferido_at ?? a.created_at).slice(0, 7); // YYYY-MM
      const g = byMonth.get(key) ?? { total: 0, destinos: new Map() };
      g.total += Number(a.valor);
      g.destinos.set(a.destino, (g.destinos.get(a.destino) ?? 0) + Number(a.valor));
      byMonth.set(key, g);
    }
    return Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allocs]);

  return (
    <div className="space-y-6">
      {/* Como funciona */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2.5 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          Todo <strong className="text-foreground">pagamento de cliente</strong> que cai no InfinitePay é dividido automaticamente conforme a regra abaixo. O app calcula quanto vai pra cada destino — <strong className="text-foreground">a transferência entre bancos você faz nos apps</strong> e marca aqui como feita. Outras entradas do caixa não entram nessa divisão.
        </p>
      </div>

      {/* Regra de rateio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PiggyBank className="w-4 h-4 text-primary" /> Regra de Rateio</CardTitle>
          <CardDescription>Como dividir cada recebimento. A soma deve dar 100%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-5" placeholder="Fatia (ex: Salário)" value={r.label}
                onChange={e => setRule(i, { label: e.target.value })} />
              <div className="col-span-3 flex items-center gap-1">
                <Input type="number" min="0" max="100" step="0.01" placeholder="%" value={r.percent}
                  onChange={e => setRule(i, { percent: parseFloat(e.target.value) || 0 })} />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Input className="col-span-3" placeholder="Destino (ex: PicPay PF)" value={r.destino}
                onChange={e => setRule(i, { destino: e.target.value })} />
              <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeRule(i)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" onClick={addRule}><Plus className="w-4 h-4 mr-1" /> Fatia</Button>
            <span className={`text-sm font-semibold ${Math.round(somaPct) === 100 ? 'text-green-600' : 'text-red-600'}`}>
              Soma: {somaPct}%
            </span>
          </div>
          <Button onClick={saveRules} disabled={savingRules} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-1" /> {savingRules ? 'Salvando…' : 'Salvar regra'}
          </Button>
        </CardContent>
      </Card>

      {/* A transferir */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">A Transferir</CardTitle>
          <CardDescription>Quanto mover para cada banco/conta (recebimentos ainda não distribuídos).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : porDestino.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nada pendente pra transferir. 🎉</p>
          ) : (
            <div className="space-y-4">
              {porDestino.map(([destino, g]) => (
                <div key={destino} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{destino}</p>
                      <p className="text-lg font-bold text-primary">{money(g.total)}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 text-green-600 hover:text-green-700"
                      disabled={busy !== null} onClick={() => marcarTransferido(g.items.map(x => x.id))}>
                      <Check className="w-3.5 h-3.5" /> Marcar tudo transferido
                    </Button>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-border">
                    {g.items.map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground truncate">
                          {a.label} — {money(a.valor)}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                          disabled={busy !== null} onClick={() => marcarTransferido([a.id])}>
                          transferido
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico transferido por mês */}
      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Histórico transferido</CardTitle>
            <CardDescription>Total já distribuído para cada destino, por mês.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {historico.map(([ym, g]) => (
              <div key={ym} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{mesLabel(ym)}</p>
                  <p className="text-sm font-bold text-green-600">{money(g.total)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {Array.from(g.destinos.entries()).map(([destino, total]) => (
                    <div key={destino} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{destino}</span>
                      <span className="font-medium text-foreground">{money(total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}