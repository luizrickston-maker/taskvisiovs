import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, CheckCircle2, Trash2, AlertTriangle, Clock, XCircle, CheckCheck, RefreshCcw, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ContaPagarForm } from './ContaPagarForm';
import { useContasPagar, useMarcarContaPaga, useDeleteContaPagar } from '@/hooks/useCaixaPJ';
import { formatCurrency } from '@/lib/currency';
import { CONTA_STATUS_LABELS, FORMA_PAGAMENTO_LABELS } from '@/types/caixa';
import type { ContaPagarStatus, ContaPagar, CaixaFormaPagamento } from '@/types/caixa';

const STATUS_CONFIG: Record<ContaPagarStatus, {
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeClass: string;
}> = {
  pendente: { label: 'Pendente', icon: Clock, badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  pago: { label: 'Pago', icon: CheckCircle2, badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  vencido: { label: 'Vencido', icon: AlertTriangle, badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
  cancelado: { label: 'Cancelado', icon: XCircle, badgeClass: 'bg-muted/50 text-muted-foreground border-border' },
};

function MarcarPagoDialog({
  conta,
  open,
  onClose,
}: {
  conta: ContaPagar | null;
  open: boolean;
  onClose: () => void;
}) {
  const [forma, setForma] = useState<CaixaFormaPagamento | ''>('');
  const marcarPaga = useMarcarContaPaga();

  if (!conta) return null;

  const handleConfirm = async () => {
    await marcarPaga.mutateAsync({
      id: conta.id,
      forma_pagamento: forma as CaixaFormaPagamento || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como Pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/30 space-y-1">
            <p className="font-medium text-sm">{conta.descricao}</p>
            {conta.fornecedor && <p className="text-xs text-muted-foreground">{conta.fornecedor}</p>}
            <p className="font-bold text-emerald-500">{formatCurrency(Number(conta.valor))}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Forma de Pagamento</label>
            <Select onValueChange={v => setForma(v as CaixaFormaPagamento)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMA_PAGAMENTO_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleConfirm}
            disabled={marcarPaga.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1.5" />
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContasPagarLista() {
  const [showForm, setShowForm] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [pagandoConta, setPagandoConta] = useState<ContaPagar | null>(null);

  const { data: contas = [], isLoading } = useContasPagar();
  const deleteConta = useDeleteContaPagar();

  const contasFiltradas = useMemo(() => {
    return contas.filter(c => {
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          c.descricao.toLowerCase().includes(s) ||
          (c.fornecedor?.toLowerCase().includes(s) ?? false)
        );
      }
      return true;
    });
  }, [contas, filtroStatus, search]);

  const totais = useMemo(() => ({
    pendente: contas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0),
    vencido: contas.filter(c => c.status === 'vencido').reduce((s, c) => s + Number(c.valor), 0),
    pago: contas.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0),
  }), [contas]);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="font-bold text-amber-500">{formatCurrency(totais.pendente)}</p>
        </div>
        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
          <p className="text-xs text-muted-foreground">Vencido</p>
          <p className="font-bold text-destructive">{formatCurrency(totais.vencido)}</p>
        </div>
        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-xs text-muted-foreground">Pago</p>
          <p className="font-bold text-emerald-500">{formatCurrency(totais.pago)}</p>
        </div>
      </div>

      {/* Actions + Filters */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Nova Conta
        </Button>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : contasFiltradas.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nenhuma conta encontrada
        </div>
      ) : (
        <ScrollArea className="h-[420px] pr-2">
          <div className="space-y-2">
            {contasFiltradas.map(conta => {
              const cfg = STATUS_CONFIG[conta.status];
              const StatusIcon = cfg.icon;
              const venceHoje = conta.status === 'pendente' && isToday(parseISO(conta.data_vencimento));

              return (
                <Card key={conta.id} className={`glass-card ${conta.status === 'vencido' ? 'border-destructive/30' : ''}`}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <Badge variant="outline" className={`text-xs gap-1 ${cfg.badgeClass}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{conta.descricao}</p>
                            {conta.fornecedor && (
                              <p className="text-xs text-muted-foreground">{conta.fornecedor}</p>
                            )}
                          </div>
                          <span className="font-bold text-sm shrink-0">{formatCurrency(Number(conta.valor))}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={`text-xs ${conta.status === 'vencido' ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            Vence: {format(parseISO(conta.data_vencimento), 'dd/MM/yyyy')}
                            {venceHoje && ' (Hoje!)'}
                          </span>
                          {conta.data_pagamento && (
                            <span className="text-xs text-emerald-500">
                              • Pago: {format(parseISO(conta.data_pagamento), 'dd/MM/yyyy')}
                            </span>
                          )}
                          {conta.categoria && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 h-4">
                              <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: conta.categoria.cor, display: 'inline-block' }} />
                              {conta.categoria.nome}
                            </Badge>
                          )}
                          {conta.recorrente && conta.frequencia && (
                            <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4 gap-0.5">
                              <RefreshCcw className="w-2.5 h-2.5" />
                              {conta.frequencia}
                            </Badge>
                          )}
                          {conta.forma_pagamento && (
                            <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">
                              {FORMA_PAGAMENTO_LABELS[conta.forma_pagamento]}
                            </Badge>
                          )}
                        </div>
                        {conta.observacoes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{conta.observacoes}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {(conta.status === 'pendente' || conta.status === 'vencido') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            title="Marcar como pago"
                            onClick={() => setPagandoConta(conta)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteConta.mutate(conta.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <ContaPagarForm open={showForm} onClose={() => setShowForm(false)} />
      <MarcarPagoDialog
        conta={pagandoConta}
        open={!!pagandoConta}
        onClose={() => setPagandoConta(null)}
      />
    </div>
  );
}
