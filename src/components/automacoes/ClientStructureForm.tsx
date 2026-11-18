import { useState } from 'react';
import { FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RunResult, type FrameioRunResult } from './RunResult';

export interface ClientOption {
  id: string;
  name: string;
  isActive: boolean;
}

const SUBMIT_LABEL = 'Criar estrutura';
const NO_ACTIVE_CLIENTS = 'Nenhum cliente ativo cadastrado.';

interface ClientStructureFormProps {
  /** Chega cru da página; o filtro por `is_active` acontece aqui, não na tela. */
  clients: ClientOption[];
  /** MENU-03: sem isto não existe nenhuma ação de criação no componente. */
  canManage: boolean;
  isPending: boolean;
  result: FrameioRunResult | null;
  /** Conflito de trava, recusa de conexão, ou qualquer outro aviso da função. */
  message: string | null;
  onRun: (clientId: string) => void;
}

export function ClientStructureForm({
  clients,
  canManage,
  isPending,
  result,
  message,
  onRun,
}: ClientStructureFormProps) {
  const [clientId, setClientId] = useState('');

  // MENU-03 / spec: só cliente ativo entra no seletor.
  const active = clients.filter((client) => client.isActive);

  if (!canManage) return null;

  const disabled = isPending || !clientId;
  const rerun = () => onRun(clientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderTree className="h-4 w-4" /> Cliente novo
        </CardTitle>
        <CardDescription>
          Cria o projeto do cliente no Frame.io com as cinco pastas fixas: Contratos, Artes, Textos
          e Roteiros, Relatórios e Vídeos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={clientId} onValueChange={setClientId} disabled={isPending}>
          <SelectTrigger aria-label="Cliente" className="w-full">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {active.length === 0 && (
              <SelectItem value="__none" disabled>
                {NO_ACTIVE_CLIENTS}
              </SelectItem>
            )}
            {active.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="w-full" disabled={disabled} onClick={rerun}>
          {isPending ? 'Criando...' : SUBMIT_LABEL}
        </Button>

        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}

        {result && <RunResult result={result} onRetry={rerun} />}
      </CardContent>
    </Card>
  );
}
