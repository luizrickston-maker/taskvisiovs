import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRight, Sparkles, Brain, Zap } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');
const signupPasswordSchema = z
  .string()
  .min(10, 'Senha deve ter no mínimo 10 caracteres')
  .regex(/[a-zA-Z]/, 'Senha deve conter pelo menos uma letra')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^a-zA-Z0-9]/, 'Senha deve conter pelo menos um símbolo (!@#$%...)');

interface Props {
  onShowReset: () => void;
  onShowEmailSent: (email: string) => void;
}

export function FuturisticLoginCard({ onShowReset, onShowEmailSent }: Props) {
  const { signIn, signUp } = useAuthContext();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);

    if (error) {
      setIsSubmitting(false);
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      window.location.replace('/caixa');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
    } catch {
      toast.error('Email inválido');
      return;
    }
    try {
      signupPasswordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        const errorCode = (error as any)?.code || '';
        const errorMessage = error.message || '';
        if (errorCode === 'weak_password' || errorMessage.includes('weak') || errorMessage.includes('pwned')) {
          toast.error('Senha muito fraca ou já comprometida. Use uma senha mais forte.');
        } else if (errorMessage.includes('User already registered') || errorCode === 'user_already_exists') {
          toast.error('Este email já está cadastrado');
        } else if (errorMessage.includes('rate limit')) {
          toast.error('Muitas tentativas. Aguarde alguns minutos.');
        } else {
          toast.error('Não foi possível criar a conta. Tente novamente.');
        }
      } else {
        onShowEmailSent(email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-md animate-scale-in">
      {/* Card glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-cyan-500/50 rounded-2xl blur-xl opacity-30 animate-pulse-glow" />
      
      {/* Main card */}
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 glow-card">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Animated logo */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 rounded-2xl rotate-6 opacity-50 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center">
              <Brain className="w-10 h-10 text-white" />
            </div>
            {/* Sparkle effects */}
            <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400 animate-pulse" />
            <Zap className="absolute -bottom-1 -left-1 w-4 h-4 text-cyan-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <h1 className="text-3xl font-display font-bold glow-text bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text">
            TaskVision PRO
          </h1>
          <p className="text-muted-foreground mt-2">
            Potencialize sua gestão com IA
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
              mode === 'login'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 ${
              mode === 'signup'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            {mode === 'signup' && (
              <p className="text-xs text-muted-foreground">
                10+ caracteres com letras, números e símbolos
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 group"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Acessar Plataforma' : 'Começar Agora'}
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        {mode === 'login' && (
          <button
            type="button"
            onClick={onShowReset}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Esqueceu a senha?
          </button>
        )}

        {/* Decorative bottom line */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Powered by AI • Seguro • Inteligente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
