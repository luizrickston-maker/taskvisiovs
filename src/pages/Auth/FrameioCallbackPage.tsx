import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Chave do `state` guardado pelo card — definida lá, lida aqui uma única vez. */
import { FRAMEIO_OAUTH_KEY } from '@/components/automacoes/FrameioConnectionCard';
export { FRAMEIO_OAUTH_KEY };

/** Mesma regra do AuthCallback: tira HTML e corta em 200 caracteres. */
function sanitizeErrorMessage(msg: string | null | undefined): string {
  if (!msg) return 'Não foi possível conectar no Frame.io';
  return msg.replace(/<[^>]*>?/gm, '').slice(0, 200);
}

type Status = 'loading' | 'success' | 'error';

/**
 * Recebe `?code=&state=` (ou `?error=`) do Adobe, valida o `state` contra o que
 * esta mesma sessão guardou e só então entrega o `code` à edge function.
 *
 * A ordem é a exigência do spec: o `state` é conferido — e apagado — **antes**
 * de qualquer chamada (AUTH-02), para que um callback forjado não dispare a
 * troca de token.
 */
export default function FrameioCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Conectando ao Frame.io...');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const adobeError = params.get('error');
      const adobeDescription = params.get('error_description');
      const code = params.get('code');
      const state = params.get('state');

      const stored = sessionStorage.getItem(FRAMEIO_OAUTH_KEY);
      sessionStorage.removeItem(FRAMEIO_OAUTH_KEY);

      if (cancelled) return;

      if (adobeError) {
        // O código cru (`access_denied`) não diz nada a quem usa; sem descrição
        // fica a mensagem padrão. Quem precisa do código olha a rede.
        setStatus('error');
        setMessage(sanitizeErrorMessage(adobeDescription));
        return;
      }

      if (!stored || state !== stored) {
        setStatus('error');
        setMessage('Conexão cancelada');
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Código de autorização ausente');
        return;
      }

      const { data: workspaceId } = await supabase.rpc('get_my_workspace_id');
      if (cancelled) return;
      if (!workspaceId) {
        setStatus('error');
        setMessage('Workspace não encontrado');
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('frameio-connect', {
        body: { code, workspaceId },
      });
      if (cancelled) return;

      if (fnError || !data?.ok) {
        setStatus('error');
        setMessage(sanitizeErrorMessage((data as { error?: string } | null)?.error ?? fnError?.message));
        return;
      }

      setStatus('success');
      navigate('/pj/automacoes', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
            Conexão com o Frame.io
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/pj/automacoes', { replace: true })}>
              Voltar para Automações
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
