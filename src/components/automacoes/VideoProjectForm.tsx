import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RunResult, type FrameioRunResult } from './RunResult';
import type { ClientOption } from './ClientStructureForm';

const upper = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);
const slugPart = (value: string) => value.trim().replace(/\s+/g, '-');

/**
 * Construtor do cliente, escrito de forma INDEPENDENTE do
 * `supabase/functions/_shared/frameio/names.ts`: lá os nomes são constantes
 * literais (o runtime de edge não garante locale do Intl), aqui é `date-fns`
 * com `ptBR`. As duas implementações são cruzadas pela contract test — é
 * exatamente uma divergência de locale que ela existe para pegar.
 */
export function buildProjectFolderName(input: {
  dateISO: string;
  tipo: string;
  nomeProjeto: string;
}): string {
  const date = parseISO(input.dateISO);
  // 'quinta-feira' → 'Quinta'; 'sábado' e 'domingo' já vêm sem hífen.
  const weekday = upper(format(date, 'EEEE', { locale: ptBR }).split('-')[0]);
  return `${format(date, 'yyyy-MM-dd')}_${weekday}-${slugPart(input.tipo)}-${slugPart(
    input.nomeProjeto,
  )}`;
}

export function buildMonthFolderName(dateISO: string): string {
  const date = parseISO(dateISO);
  return `${format(date, 'yyyy-MM')}-${upper(format(date, 'MMMM', { locale: ptBR }))}`;
}

export const SUBMIT_VIDEO_LABEL = 'Criar projeto de vídeo';
export const DEFAULT_TIPO = 'Video';

export interface VideoRunInput {
  clientId: string;
  dateISO: string;
  tipo: string;
  nomeProjeto: string;
}

interface VideoProjectFormProps {
  clients: ClientOption[];
  canManage: boolean;
  isPending: boolean;
  result: FrameioRunResult | null;
  message: string | null;
  onRun: (input: VideoRunInput) => void;
}

export function VideoProjectForm({
  clients,
  canManage,
  isPending,
  result,
  message,
  onRun,
}: VideoProjectFormProps) {
  const [clientId, setClientId] = useState('');
  const [dateISO, setDateISO] = useState('');
  const [tipo, setTipo] = useState(DEFAULT_TIPO);
  const [nomeProjeto, setNomeProjeto] = useState('');

  if (!canManage) return null;

  const active = clients.filter((client) => client.isActive);
  const ready = Boolean(clientId && dateISO && tipo.trim() && nomeProjeto.trim());
  const disabled = isPending || !ready;

  const submit = () => {
    if (disabled) return;
    onRun({ clientId, dateISO, tipo, nomeProjeto });
  };

  const preview = dateISO && tipo.trim() && nomeProjeto.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clapperboard className="h-4 w-4" /> Projeto de vídeo
        </CardTitle>
        <CardDescription>
          Cria a pasta do mês (se ainda não existir) e a pasta do projeto com Brutos, Cenas de
          Apoio e Editados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={clientId} onValueChange={setClientId} disabled={isPending}>
          <SelectTrigger aria-label="Cliente" className="w-full">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {active.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="video-date">Data</Label>
            <Input
              id="video-date"
              type="date"
              value={dateISO}
              disabled={isPending}
              onChange={(event) => setDateISO(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-tipo">Tipo</Label>
            <Input
              id="video-tipo"
              value={tipo}
              disabled={isPending}
              onChange={(event) => setTipo(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-nome">Nome do projeto</Label>
            <Input
              id="video-nome"
              value={nomeProjeto}
              placeholder="Lancamento"
              disabled={isPending}
              onChange={(event) => setNomeProjeto(event.target.value)}
            />
          </div>
        </div>

        {preview && (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p>
              <span className="font-medium">Pasta de mês:</span>{' '}
              <code>{buildMonthFolderName(dateISO)}</code>
            </p>
            <p className="mt-1">
              <span className="font-medium">Pasta do projeto:</span>{' '}
              <code>{buildProjectFolderName({ dateISO, tipo, nomeProjeto })}</code>
            </p>
          </div>
        )}

        <Button className="w-full" disabled={disabled} onClick={submit}>
          {isPending ? 'Criando...' : SUBMIT_VIDEO_LABEL}
        </Button>

        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        {result && <RunResult result={result} onRetry={submit} />}
      </CardContent>
    </Card>
  );
}
