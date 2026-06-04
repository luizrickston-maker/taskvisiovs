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
        toast.error((error as any).errors[0].message);
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
      window.location.replace('/');
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
        toast.error((error as any).errors[0].message);
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
    <div className="relative w-full max-w-[420px] sm:max-w-[480px] md:max-w-[520px] lg:max-w-[560px] animate-scale-in">
      {/* Branding - Outside the card */}
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
          Task Vision
        </h1>
        <p className="text-muted-foreground mt-2 text-xs md:text-sm max-w-[300px] md:max-w-none mx-auto">
          Potencialize sua gestão pessoal e empresarial com IA
        </p>
      </div>

      {/* Card glow effect */}
      <div className="absolute -inset-0.5 top-16 md:top-20 bg-gradient-to-r from-primary/30 via-purple-500/30 to-cyan-500/30 rounded-xl blur-lg opacity-20" />
      
      {/* Main card */}
      <div className="relative bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl p-6 md:p-8 shadow-xl">
        {/* Mode switcher */}
        <div className="flex gap-1 p-0.5 bg-muted/40 rounded-md mb-5">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all duration-200 ${
              mode === 'login'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs md:text-sm font-medium">
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
                className="pl-10 h-10 md:h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all text-sm"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs md:text-sm font-medium">
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
                className="pl-10 h-10 md:h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all text-sm"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            {mode === 'signup' && (
              <p className="text-[11px] md:text-xs text-muted-foreground">
                10+ caracteres com letras, números e símbolos
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 md:h-11 text-sm font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-sm transition-all duration-200 hover:shadow-md group"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Acessar' : 'Criar Conta'}
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        {mode === 'login' && (
          <button
            type="button"
            onClick={onShowReset}
            className="w-full mt-3 text-xs md:text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Esqueceu a senha?
          </button>
        )}

        {/* Decorative bottom line */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex items-center justify-center gap-2 text-[11px] md:text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span>Seguro • Inteligente • Powered by AI</span>
          </div>
        </div>

        {/* Rick Prospero button */}
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 md:h-11 text-sm font-semibold"
          >
            Rick Prospero
          </Button>
        </div>
      </div>
    </div>
  );
}
