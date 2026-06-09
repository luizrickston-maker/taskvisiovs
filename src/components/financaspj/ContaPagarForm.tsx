import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateContaPagar } from '@/hooks/useCaixaPJ';
import { useCaixaCategorias } from '@/hooks/useCaixaPJ';
import { FORMA_PAGAMENTO_LABELS, FREQUENCIA_LABELS } from '@/types/caixa';
import type { CaixaFormaPagamento, ContaPagarFrequencia } from '@/types/caixa';
import { useState } from 'react';

interface ContaPagarFormValues {
  descricao: string;
  fornecedor: string;
  valor: string;
  data_vencimento: string;
  categoria_id: string;
  forma_pagamento: CaixaFormaPagamento | '';
  recorrente: boolean;
  frequencia: ContaPagarFrequencia | '';
  observacoes: string;
}

interface ContaPagarFormProps {
  open: boolean;
  onClose: () => void;
}

export function ContaPagarForm({ open, onClose }: ContaPagarFormProps) {
  const { data: categorias = [] } = useCaixaCategorias();
  const createConta = useCreateContaPagar();
  const [recorrente, setRecorrente] = useState(false);

  const categoriasSaida = categorias.filter(c => c.tipo === 'saida' || c.tipo === 'ambos');

  const { register, handleSubmit, setValue, reset } = useForm<ContaPagarFormValues>({
    defaultValues: {
      descricao: '',
      fornecedor: '',
      valor: '',
      data_vencimento: '',
      categoria_id: '',
      forma_pagamento: '',
      recorrente: false,
      frequencia: '',
      observacoes: '',
    },
  });

  const onSubmit = async (values: ContaPagarFormValues) => {
    const numVal = parseFloat(values.valor);
    if (isNaN(numVal) || numVal <= 0) return;

    await createConta.mutateAsync({
      descricao: values.descricao.trim(),
      fornecedor: values.fornecedor.trim() || undefined,
      valor: numVal,
      data_vencimento: values.data_vencimento,
      categoria_id: values.categoria_id || undefined,
      forma_pagamento: (values.forma_pagamento as CaixaFormaPagamento) || undefined,
      recorrente,
      frequencia: recorrente ? (values.frequencia as ContaPagarFrequencia) || undefined : undefined,
      observacoes: values.observacoes.trim() || undefined,
    });

    reset();
    setRecorrente(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Descrição */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="cp-descricao">Descrição *</Label>
              <Input
                id="cp-descricao"
                placeholder="Ex: Aluguel, Energia, Software..."
                {...register('descricao', { required: true })}
              />
            </div>

            {/* Fornecedor */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="cp-fornecedor">Fornecedor / Credor</Label>
              <Input
                id="cp-fornecedor"
                placeholder="Ex: Locadora Imóveis SA"
                {...register('fornecedor')}
              />
            </div>

            {/* Valor */}
            <div className="space-y-1">
              <Label htmlFor="cp-valor">Valor (R$) *</Label>
              <Input
                id="cp-valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                {...register('valor', { required: true })}
              />
            </div>

            {/* Vencimento */}
            <div className="space-y-1">
              <Label htmlFor="cp-vencimento">Vencimento *</Label>
              <Input
                id="cp-vencimento"
                type="date"
                {...register('data_vencimento', { required: true })}
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select onValueChange={v => setValue('categoria_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasSaida.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-1">
              <Label>Forma Preferida</Label>
              <Select onValueChange={v => setValue('forma_pagamento', v as CaixaFormaPagamento)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMA_PAGAMENTO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recorrente */}
            <div className="col-span-2 flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Conta Recorrente</p>
                <p className="text-xs text-muted-foreground">Repete periodicamente</p>
              </div>
              <Switch checked={recorrente} onCheckedChange={setRecorrente} />
            </div>

            {recorrente && (
              <div className="col-span-2 space-y-1">
                <Label>Frequência</Label>
                <Select onValueChange={v => setValue('frequencia', v as ContaPagarFrequencia)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCIA_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Observações */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="cp-obs">Observações</Label>
              <Textarea
                id="cp-obs"
                placeholder="Detalhes, número do boleto, etc."
                rows={2}
                {...register('observacoes')}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={createConta.isPending}>
              {createConta.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
