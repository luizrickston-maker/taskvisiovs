import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, TrendingUp, TrendingDown, Trash2, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TransacaoForm } from './TransacaoForm';
import { useCaixaTransacoes, useDeleteTransacao } from '@/hooks/useCaixaPJ';
import { formatCurrency } from '@/lib/currency';
import { FORMA_PAGAMENTO_LABELS } from '@/types/caixa';
import type { CaixaTipo } from '@/types/caixa';

export function TransacoesLista() {
  const [showForm, setShowForm] = useState(false);
  const [defaultTipo, setDefaultTipo] = useState<CaixaTipo>('entrada');
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroMes, setFiltroMes] = useState(() => format(new Date(), 'yyyy-MM'));

  const dataInicio = `${filtroMes}-01`;
  const dataFim = format(new Date(
    parseInt(filtroMes.split('-')[0]),
    parseInt(filtroMes.split('-')[1]),
    0
  ), 'yyyy-MM-dd');

  const { data: transacoes = [], isLoading } = useCaixaTransacoes({ dataInicio, dataFim });
  const deleteTransacao = useDeleteTransacao();

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          t.descricao.toLowerCase().includes(s) ||
          (t.origem_destino?.toLowerCase().includes(s) ?? false) ||
          (t.categoria?.nome.toLowerCase().includes(s) ?? false) ||
          (t.referencia?.toLowerCase().includes(s) ?? false)
        );
      }
      return true;
    });
  }, [transacoes, filtroTipo, search]);

  const { totalEntradas, totalSaidas } = useMemo(() => ({
    totalEntradas: transacoesFiltradas.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0),
    totalSaidas: transacoesFiltradas.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0),
  }), [transacoesFiltradas]);

  const openForm = (tipo: CaixaTipo) => {
    setDefaultTipo(tipo);
    setShowForm(true);
  };

  // Generate last 12 months options
  const mesesOptions = useMemo(() => {
    const opts = [];
    const hoje = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      opts.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy', { locale: ptBR }),
      });
    }
    return opts;
  }, []);

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          onClick={() => openForm('entrada')}
        >
          <Plus className="w-4 h-4" />
          Entrada
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5"
          onClick={() => openForm('saida')}
        >
          <Plus className="w-4 h-4" />
          Saída
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="entrada">Entradas</SelectItem>
            <SelectItem value="saida">Saídas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mesesOptions.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 text-sm">
        <span className="text-emerald-500 font-semibold">
          ↑ {formatCurrency(totalEntradas)}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-destructive font-semibold">
          ↓ {formatCurrency(totalSaidas)}
        </span>
        <span className="text-muted-foreground">|</span>
        <span className={`font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-primary' : 'text-destructive'}`}>
          Saldo: {formatCurrency(totalEntradas - totalSaidas)}
        </span>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : transacoesFiltradas.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhuma transação encontrada
        </div>
      ) : (
        <ScrollArea className="h-[420px] pr-2">
          <div className="space-y-2">
            {transacoesFiltradas.map(t => (
              <Card key={t.id} className="glass-card">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-md mt-0.5 ${t.tipo === 'entrada' ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                      {t.tipo === 'entrada'
                        ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                        : <TrendingDown className="w-4 h-4 text-destructive" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{t.descricao}</p>
                        <span className={`font-bold text-sm shrink-0 ${t.tipo === 'entrada' ? 'text-emerald-500' : 'text-destructive'}`}>
                          {t.tipo === 'entrada' ? '+' : '−'} {formatCurrency(Number(t.valor))}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(t.data), 'dd/MM/yyyy')}
                        </span>
                        {t.origem_destino && (
                          <span className="text-xs text-muted-foreground">• {t.origem_destino}</span>
                        )}
                        {t.categoria && (
                          <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                            <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: t.categoria.cor, display: 'inline-block' }} />
                            {t.categoria.nome}
                          </Badge>
                        )}
                        {t.forma_pagamento && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">
                            {FORMA_PAGAMENTO_LABELS[t.forma_pagamento]}
                          </Badge>
                        )}
                        {t.referencia && (
                          <span className="text-xs text-muted-foreground">• {t.referencia}</span>
                        )}
                      </div>
                      {t.observacoes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.observacoes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTransacao.mutate(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <TransacaoForm open={showForm} defaultTipo={defaultTipo} onClose={() => setShowForm(false)} />
    </div>
  );
}
