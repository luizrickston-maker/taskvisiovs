import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
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
      </CardContent>
    </Card>
  );
}
