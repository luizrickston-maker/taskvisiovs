import { useState } from 'react';
import { FolderTree } from 'lucide-react';
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

export interface ClientOption {
  id: string;
  name: string;
  isActive: boolean;
}

const SUBMIT_LABEL = 'Criar estrutura';
const NO_ACTIVE_CLIENTS = 'Nenhum cliente ativo cadastrado.';

interface ClientStructureFormProps {
  /** Lista vinda da página, no formato do banco (`is_active` já convertido). */
  clients: ClientOption[];
  /** MENU-03: sem isto não existe nenhuma ação de criação no componente. */
  canManage: boolean;
  isPending: boolean;
  result: FrameioRunResult | null;
  /** Conflito de trava, recusa de conexão, ou qualquer outro aviso da função. */
  message: string | null;
  /** Projetos já existentes no Frame.io — só para a prévia, não para escolher. */
  frameioProjects?: { id: string; name: string }[];
  /** O nome do projeto a criar no Frame.io; a página repassa à função. */
  onRun: (clientId: string, projectName: string) => void;
}

export function ClientStructureForm({
  clients,
  canManage,
  isPending,
  result,
  message,
  frameioProjects,
  onRun,
}: ClientStructureFormProps) {
  const [clientId, setClientId] = useState('');
  const [projectName, setProjectName] = useState('');

  // O inativo entra marcado, não some: omitir cadastro é o que fez a lista
  // parecer vazia para quem tem clientes.
  const active = clients;

  if (!canManage) return null;

  const selected = clients.find((client) => client.id === clientId);
  const name = projectName.trim();
  const disabled = isPending || !clientId || !name;
  const rerun = () => onRun(clientId, name);

  const pickClient = (id: string) => {
    setClientId(id);
    // Semeia o nome do projeto com o do cliente; quem quiser outro, edita.
    const chosen = clients.find((client) => client.id === id);
    if (chosen) setProjectName(chosen.name);
  };

  const exists = !!name && (frameioProjects ?? []).some((project) => project.name === name);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderTree className="h-4 w-4" /> Cliente novo
        </CardTitle>
        <CardDescription>
          Escolha o cliente do TaskVisio, digite o nome do projeto que vai ser criado no Frame.io e
          as cinco pastas fixas: Contratos, Artes, Textos e Roteiros, Relatórios e Vídeos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="client-structure-client">Cliente</Label>
          <Select value={clientId} onValueChange={pickClient} disabled={isPending}>
            <SelectTrigger id="client-structure-client" aria-label="Cliente" className="w-full">
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
                  {client.isActive ? '' : ' (inativo)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client-structure-project">Nome do projeto no Frame.io</Label>
          <Input
            id="client-structure-project"
            value={projectName}
            disabled={isPending}
            placeholder="Nome do projeto a criar"
            onChange={(event) => setProjectName(event.target.value)}
          />
        </div>

        {name && (
          <p className="text-xs text-muted-foreground" data-testid="frameio-preview">
            {exists
              ? `Projeto "${name}" já existe no Frame.io — só as pastas serão criadas.`
              : `Projeto "${name}" será criado no Frame.io.`}
          </p>
        )}

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
