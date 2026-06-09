import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateTransacao } from '@/hooks/useCaixaPJ';
import { useCaixaCategorias } from '@/hooks/useCaixaPJ';
import { FORMA_PAGAMENTO_LABELS } from '@/types/caixa';
import type { CaixaTipo, CaixaFormaPagamento } from '@/types/caixa';

interface TransacaoFormValues {
  tipo: CaixaTipo;
  descricao: string;
  valor: string;
  data: string;
  origem_destino: string;
  categoria_id: string;
  forma_pagamento: CaixaFormaPagamento | '';
  observacoes: string;
  referencia: string;
}

interface TransacaoFormProps {
  open: boolean;
  defaultTipo?: CaixaTipo;
  onClose: () => void;
}

export function TransacaoForm({ open, defaultTipo = 'entrada', onClose }: TransacaoFormProps) {
  const { data: categorias = [] } = useCaixaCategorias();
  const createTransacao = useCreateTransacao();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransacaoFormValues>({
    defaultValues: {
      tipo: defaultTipo,
      descricao: '',
      valor: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      origem_destino: '',
      categoria_id: '',
      forma_pagamento: '',
      observacoes: '',
      referencia: '',
    },
  });

  const tipo = watch('tipo');

  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo || c.tipo === 'ambos');

  const onSubmit = async (values: TransacaoFormValues) => {
    const numVal = parseFloat(values.valor);
    if (isNaN(numVal) || numVal <= 0) return;

    await createTransacao.mutateAsync({
      tipo: values.tipo,
      descricao: values.descricao.trim(),
      valor: numVal,
      data: values.data,
      origem_destino: values.origem_destino.trim() || undefined,
      categoria_id: values.categoria_id || undefined,
      forma_pagamento: (values.forma_pagamento as CaixaFormaPagamento) || undefined,
      observacoes: values.observacoes.trim() || undefined,
      referencia: values.referencia.trim() || undefined,
    });

    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={tipo === 'entrada' ? 'default' : 'outline'}
              className={tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
              onClick={() => setValue('tipo', 'entrada')}
            >
              + Entrada
            </Button>
            <Button
              type="button"
              variant={tipo === 'saida' ? 'default' : 'outline'}
              className={tipo === 'saida' ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}
              onClick={() => setValue('tipo', 'saida')}
            >
              − Saída
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Descrição */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                placeholder={tipo === 'entrada' ? 'Ex: Pagamento cliente X' : 'Ex: Aluguel escritório'}
                {...register('descricao', { required: true })}
              />
            </div>

            {/* Valor */}
            <div className="space-y-1">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                {...register('valor', { required: true })}
              />
            </div>

            {/* Data */}
            <div className="space-y-1">
              <Label htmlFor="data">Data *</Label>
              <Input id="data" type="date" {...register('data', { required: true })} />
            </div>

            {/* Origem/Destino */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="origem_destino">
                {tipo === 'entrada' ? 'Origem (quem pagou)' : 'Destino (para quem)'}
              </Label>
              <Input
                id="origem_destino"
                placeholder={tipo === 'entrada' ? 'Ex: Empresa ABC Ltda' : 'Ex: Fornecedor XYZ'}
                {...register('origem_destino')}
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
                  {categoriasFiltradas.map(c => (
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
              <Label>Forma de Pagamento</Label>
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

            {/* Referência */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="referencia">Referência / Nº Nota</Label>
              <Input
                id="referencia"
                placeholder="Ex: NF-00123, Contrato #456"
                {...register('referencia')}
              />
            </div>

            {/* Observações */}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Detalhes adicionais..."
                rows={2}
                {...register('observacoes')}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 ${tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'} text-white`}
              disabled={createTransacao.isPending}
            >
              {createTransacao.isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
