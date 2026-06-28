import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClientCharge, STATUS_META, money, formatBRDate, marcarCobrancaPaga } from '@/lib/cobrancas';

type Row = ClientCharge & { client?: { name: string } | null };

export function ContasReceberTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('client_charges')
      .select('*, client:clients(name)')
      .in('status', ['pendente', 'vencido'])
      .order('due_date', { ascending: true });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalAberto = rows.reduce((s, r) => s + Number(r.valor), 0);
  const totalVencido = rows.filter(r => r.status === 'vencido').reduce((s, r) => s + Number(r.valor), 0);

  const handlePagar = async (r: Row) => {
    setBusy(r.id);
    try { await marcarCobrancaPaga(r, r.client?.name); toast.success('Baixada e lançada no caixa.'); load(); }
    catch { toast.error('Erro ao marcar como paga.'); }
    finally { setBusy(null); }
  };

  const copy = (link: string) => { navigator.clipboard.writeText(link); toast.success('Link copiado!'); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total a Receber</p>
              <p className="text-xl font-bold text-primary">{money(totalAberto)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-xl font-bold text-red-600">{money(totalVencido)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cobrança em aberto. 🎉</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => {
                const meta = STATUS_META[r.status];
                return (
                  <div key={r.id} className="rounded-lg border border-border p-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {r.client?.name ?? 'Cliente'} — {r.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {money(r.valor)} • vence {formatBRDate(r.due_date)}
                      </p>
                    </div>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    {r.payment_link && (
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => copy(r.payment_link!)}>
                        <Copy className="w-3.5 h-3.5" /> Link
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-green-600 hover:text-green-700"
                      disabled={busy === r.id} onClick={() => handlePagar(r)}>
                      <Check className="w-3.5 h-3.5" /> Marcar paga
                    </Button>
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