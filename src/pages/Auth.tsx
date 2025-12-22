import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Wallet, Loader2, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres');

export default function Auth() {
  const { user, loading, signIn, signUp, resetPassword } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/caixa" replace />;
  }

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      if (!showResetPassword) {
        passwordSchema.parse(password);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

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
      // Navegar imediatamente após sucesso, antes do state update
      navigate('/caixa', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message);
      }
    } else {
      setShowEmailSent(true);
    }
  };

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
      toast.error(error.message);
    } else {
      toast.success('Email de recuperação enviado!');
      setShowResetPassword(false);
    }
  };

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass-card animate-scale-in">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">Recuperar Senha</CardTitle>
            <CardDescription>
              Digite seu email para receber o link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowResetPassword(false)}
              >
                Voltar ao Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show email sent confirmation
  if (showEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md glass-card animate-scale-in">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-display">Verifique seu Email</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de confirmação para <strong>{email}</strong>. 
              Clique no link para ativar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Não recebeu o email? Verifique sua pasta de spam.</p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowEmailSent(false);
                setEmail('');
                setPassword('');
              }}
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-card animate-scale-in">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">Flow Control</CardTitle>
          <CardDescription>
            Gerencie suas finanças e produtividade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Entrar
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowResetPassword(true)}
                >
                  Esqueceu a senha?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
