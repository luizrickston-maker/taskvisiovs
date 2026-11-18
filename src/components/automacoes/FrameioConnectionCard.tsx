import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Link2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FrameioConnection } from '@/hooks/useFrameioConnection';

/**
 * Chave do `state` no `sessionStorage`. Fica aqui porque é o card que a grava;
 * a página de callback importa dela. Uma só fonte, senão o fluxo quebra em
 * silêncio se os dois lados divergirem.
 */
export const FRAMEIO_OAUTH_KEY = 'frameio_oauth';

/**
 * URI registrada no console da Adobe para este app. Tem de ser idêntica à
 * `FRAMEIO_REDIRECT_URI` da edge function — o OAuth exige correspondência
 * exata entre o que o browser pede e o que o servidor troca.
 */
export const FRAMEIO_CALLBACK_URL = 'https://taskvisiovs.vercel.app/auth/frameio/callback';

export const FRAMEIO_AUTHORIZE_URL = 'https://ims-na1.adobelogin.com/ims/authorize/v2';

/** Escopo pedido ao Adobe. `offline_access` é o que devolve o refresh token. */
export const FRAMEIO_SCOPE = 'openid email profile offline_access additional_info.roles';

/**
 * `client_id` de um app **Web App** é público por definição — ele vai no bundle
 * de qualquer SPA que use OAuth, e não é segredo. O `client_secret` jamais
 * aparece aqui (AUTH-05); ele só existe na edge function.
 */
export const FRAMEIO_CLIENT_ID = '8717b56f92364731b69740a921db140e';

export function buildAuthorizeUrl(args: { clientId: string; state: string }): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: args.clientId,
    redirect_uri: FRAMEIO_CALLBACK_URL,
    scope: FRAMEIO_SCOPE,
    state: args.state,
  });
  return `${FRAMEIO_AUTHORIZE_URL}?${params}`;
}

interface FrameioConnectionCardProps {
  connection: FrameioConnection | undefined;
  isLoading: boolean;
  error?: unknown;
  /** As ações de criação — só aparecem enquanto a conexão está ativa. */
  children?: ReactNode;
  /** Injetável para o teste não depender de navegação real do jsdom. */
  onRedirect?: (url: string) => void;
}

export function FrameioConnectionCard({
  connection,
  isLoading,
  error,
  children,
  onRedirect,
}: FrameioConnectionCardProps) {
  const redirect = onRedirect ?? ((url: string) => window.location.assign(url));

  const startConnect = () => {
    // Apaga antes de gerar: um retry nunca reutiliza o state anterior.
    sessionStorage.removeItem(FRAMEIO_OAUTH_KEY);
    const state = crypto.randomUUID();
    sessionStorage.setItem(FRAMEIO_OAUTH_KEY, state);
    redirect(buildAuthorizeUrl({ clientId: FRAMEIO_CLIENT_ID, state }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão com o Frame.io
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Frame.io
          </CardTitle>
          <CardDescription>Não foi possível verificar a conexão agora.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (connection.status !== 'connected') {
    const reconnecting = connection.status === 'requires_reconnect';
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Adobe Frame.io
          </CardTitle>
          <CardDescription>
            {reconnecting
              ? 'A conexão expirou e precisa ser feita de novo.'
              : 'Conecte uma vez por workspace para criar as estruturas de pastas.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startConnect}>{reconnecting ? 'Reconectar Frameio' : 'Conectar Frame.io'}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="h-4 w-4 text-green-500" /> Adobe Frame.io
          <Badge variant="outline" className="ml-auto">
            {connection.workspaceName ?? 'conectado'}
          </Badge>
        </CardTitle>
        <CardDescription>
          {connection.accountName ? `Conta ${connection.accountName}` : 'Conectado'}
        </CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
