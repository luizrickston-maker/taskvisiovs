import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContextSafe } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { FuturisticBackground } from '@/components/auth/FuturisticBackground';
import { FuturisticLoginCard } from '@/components/auth/FuturisticLoginCard';

const emailSchema = z.string().email('Email inválido');

export default function Auth() {
  const authContext = useAuthContextSafe();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  // Se contexto não existir ou estiver carregando, mostra loading
  if (!authContext || authContext.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
        </div>
      </div>
    );
  }

  const { user, resetPassword } = authContext;

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
    } catch {
      toast.error('Email inválido');
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);

    if (error) {
      if (error.message?.includes('rate limit')) {
        toast.error('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        toast.error(error.message || 'Erro ao enviar email de recuperação');
      }
    } else {
      toast.success('Se o email existir, você receberá um link de recuperação.');
      setShowResetPassword(false);
      setEmail('');
    }
  };

  // Reset Password Screen
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <FuturisticBackground />
        
        <div className="relative w-full max-w-md animate-scale-in z-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-cyan-500/50 rounded-2xl blur-xl opacity-30" />
          
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 glow-card">
            <button
              type="button"
              onClick={() => setShowResetPassword(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-display font-bold">Recuperar Senha</h1>
              <p className="text-muted-foreground mt-2">
                Digite seu email para receber o link
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background/50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-primary to-purple-600"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Email Sent Confirmation Screen
  if (showEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <FuturisticBackground />
        
        <div className="relative w-full max-w-md animate-scale-in z-10">
          <div className="absolute -inset-1 bg-gradient-to-r from-success/50 via-emerald-500/50 to-teal-500/50 rounded-2xl blur-xl opacity-30" />
          
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 glow-card">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-success to-emerald-600 flex items-center justify-center animate-scale-in">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl font-display font-bold mb-2">
                Verifique seu Email
              </h1>
              <p className="text-muted-foreground mb-6">
                Enviamos um link de confirmação para{' '}
                <strong className="text-foreground">{sentEmail}</strong>
              </p>

              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground">
                  Não recebeu o email? Verifique sua pasta de spam.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailSent(false);
                  setEmail('');
                  setSentEmail('');
                }}
                className="w-full"
              >
                Voltar ao Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <FuturisticBackground />
      
      <div className="relative z-10">
        <FuturisticLoginCard
          onShowReset={() => setShowResetPassword(true)}
          onShowEmailSent={(email) => {
            setSentEmail(email);
            setShowEmailSent(true);
          }}
        />
      </div>
    </div>
  );
}
