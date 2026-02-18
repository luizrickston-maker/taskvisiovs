import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Determines where to redirect after auth:
 * - /portal  → client-only users (no workspace membership)
 * - /caixa   → regular workspace members
 */
async function getRedirectDestination(userId: string): Promise<string> {
  const { data: workspaceId } = await supabase.rpc('get_my_workspace_id');
  if (workspaceId) return '/caixa';

  const { data: clientUser } = await supabase
    .from('client_users')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return clientUser ? '/portal' : '/caixa';
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando sua conta...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Ocorreu um erro na verificação');
          return;
        }

        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            setStatus('error');
            setMessage('Erro ao verificar sessão');
            return;
          }
          
          if (session) {
            setStatus('success');
            setMessage('Conta verificada com sucesso!');
            const dest = await getRedirectDestination(session.user.id);
            setTimeout(() => navigate(dest, { replace: true }), 1500);
            return;
          }
        }

        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        
        if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
          });
          
          if (verifyError) {
            setStatus('error');
            setMessage(verifyError.message || 'Link inválido ou expirado');
            return;
          }
          
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
          
          setStatus('success');
          setMessage('Conta verificada com sucesso!');

          const { data: { session } } = await supabase.auth.getSession();
          const dest = session ? await getRedirectDestination(session.user.id) : '/caixa';
          setTimeout(() => navigate(dest, { replace: true }), 1500);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setStatus('success');
          setMessage('Você já está autenticado!');
          const dest = await getRedirectDestination(session.user.id);
          setTimeout(() => navigate(dest, { replace: true }), 1000);
        } else {
          setStatus('error');
          setMessage('Link inválido ou expirado');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('Ocorreu um erro inesperado');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card animate-scale-in">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
          )}
          <CardTitle className="text-2xl font-display">
            {status === 'loading' && 'Verificando...'}
            {status === 'success' && 'Sucesso!'}
            {status === 'error' && 'Erro'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => navigate('/auth', { replace: true })}>
              Voltar ao Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
