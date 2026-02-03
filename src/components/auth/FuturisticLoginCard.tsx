import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
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
    <div className="relative w-full max-w-sm sm:max-w-md animate-scale-in px-4 sm:px-0">
      {/* Card glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-purple-500/40 to-cyan-500/40 rounded-2xl blur-xl opacity-25" />
      
      {/* Main card */}
      <div className="relative bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            Task Vision
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Potencialize sua gestão com IA
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1.5 sm:gap-2 p-1 bg-muted/50 rounded-lg mb-5 sm:mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-md text-sm font-medium transition-all duration-300 ${
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
            className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-md text-sm font-medium transition-all duration-300 ${
              mode === 'signup'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5 sm:space-y-2">
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
                className="pl-10 h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all text-base"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
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
                className="pl-10 h-11 sm:h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all text-base"
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
            className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 group"
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
            className="w-full mt-3 sm:mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Esqueceu a senha?
          </button>
        )}

        {/* Decorative bottom line */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/50">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-pulse" />
            <span>Powered by AI • Seguro • Inteligente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
