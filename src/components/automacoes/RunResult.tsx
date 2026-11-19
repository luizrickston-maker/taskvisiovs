import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Contrato do cliente com a edge function. É **idêntico** a `RunResult` de
 * `supabase/functions/_shared/frameio/runner.ts` — o teste de tipo ao lado
 * falha no `tsc --noEmit` se alguém mudar um lado só.
 */
export interface FrameioRunResult {
  status: 'ok' | 'failed';
  created: string[];
  existing: string[];
  failedAt?: string;
  remaining?: string[];
  error?: string;
  /** Link para o projeto no Frame.io. */
  projectViewUrl?: string;
  /** Link da pasta-alvo, quando o plano define uma. */
  folderViewUrl?: string;
}

export const CREATE_FAILED_TITLE = 'Não foi possível criar tudo';
export const NOTHING_CREATED = 'Nada foi criado.';
export const PARTIAL_CREATED = 'Criação interrompida.';
export const RETRY_LABEL = 'Tentar novamente';
export const ALREADY_EXISTED = 'Já existia';

interface RunResultProps {
  result: FrameioRunResult;
  /** Obrigatório: FAIL-01 exige a ação de repetir em toda falha. */
  onRetry: () => void;
}

export function RunResult({ result, onRetry }: RunResultProps) {
  const failed = result.status === 'failed';
  const [copied, setCopied] = useState(false);

  // No fluxo de vídeo vale a pasta do vídeo; no de cliente, o projeto.
  const link = result.folderViewUrl ?? result.projectViewUrl;

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // jsdom e navegadores sem permissão de clipboard: nada a fazer além de
      // deixar o link visível para seleção manual.
    }
  };

  return (
    <Card role={failed ? 'alert' : 'status'} className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {failed ? (
            <>
              <AlertTriangle className="h-4 w-4 text-destructive" /> {CREATE_FAILED_TITLE}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Estrutura pronta
            </>
          )}
        </CardTitle>
        <CardDescription>
          {failed
            ? result.created.length === 0
              ? NOTHING_CREATED
              : PARTIAL_CREATED
            : result.created.length === 0
              ? 'Tudo o que era necessário já existia.'
              : 'Estrutura criada no Frame.io.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-1 text-sm">
        {result.created.length > 0 && (
          <p>
            <span className="font-medium">Criado:</span> {result.created.join(', ')}
          </p>
        )}
        {result.existing.length > 0 && (
          <p className="text-muted-foreground">
            <span className="font-medium">{ALREADY_EXISTED}:</span> {result.existing.join(', ')}
          </p>
        )}

        {failed && result.failedAt && (
          <p className="text-destructive">
            Falhou em <span className="font-medium">{result.failedAt}</span>
          </p>
        )}
        {failed && (result.remaining?.length ?? 0) > 0 && (
          <p>
            <span className="font-medium">Não criado:</span> {result.remaining!.join(', ')}
          </p>
        )}
        {failed && result.error && <p className="text-destructive">{result.error}</p>}

        {failed && (
          <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5" /> {RETRY_LABEL}
          </Button>
        )}

        {link && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a href={link} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir no Frame.io
              </a>
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copiado' : 'Copiar link'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
