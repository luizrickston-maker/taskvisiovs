import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando sua conta...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash params from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for error in URL params
        const error = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'Ocorreu um erro na verificação');
          return;
        }

        // Check for access_token (means user is authenticated)
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          // Session should be automatically set by Supabase
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            setStatus('error');
            setMessage('Erro ao verificar sessão');
            return;
          }
          
          if (session) {
            setStatus('success');
            setMessage('Conta verificada com sucesso!');
            setTimeout(() => navigate('/caixa', { replace: true }), 1500);
            return;
          }
        }

        // Check for token_hash and type (email confirmation flow)
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
          
          // If it's a recovery type, redirect to reset password page
          if (type === 'recovery') {
            navigate('/reset-password', { replace: true });
            return;
          }
          
          setStatus('success');
          setMessage('Conta verificada com sucesso!');
          setTimeout(() => navigate('/caixa', { replace: true }), 1500);
          return;
        }

        // If we got here with no tokens, check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setStatus('success');
          setMessage('Você já está autenticado!');
          setTimeout(() => navigate('/caixa', { replace: true }), 1000);
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
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
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
