import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { CredentialsModal } from './CredentialsModal';

interface InviteClientUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  workspaceId: string;
  onSuccess?: () => void;
}

export function InviteClientUserModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  workspaceId,
  onSuccess,
}: InviteClientUserModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('E-mail é obrigatório');
      return;
    }
    if (!validateEmail(trimmed)) {
      setError('Informe um e-mail válido');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('invite-client-user', {
        body: { email: trimmed, clientId, workspaceId, clientName },
      });

      const isConflict = (msg: string) =>
        msg.includes('already has access') ||
        msg.includes('já possui acesso') ||
        msg.includes('already has access');

      if (fnError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: Response | undefined = (fnError as any)?.context;
        const httpStatus = response?.status;

        if (httpStatus === 409) {
          toast.info('Este e-mail já possui acesso a este cliente.');
          setEmail('');
          onOpenChange(false);
          return;
        }

        let errMessage = fnError.message ?? 'Erro ao enviar convite';
        if (response) {
          try {
            const body = await response.clone().json();
            errMessage = body?.error ?? errMessage;
          } catch {
            // ignore parse errors
          }
        }
        if (isConflict(errMessage)) {
          toast.info('Este e-mail já possui acesso a este cliente.');
          setEmail('');
          onOpenChange(false);
          return;
        }
        toast.error(errMessage);
        return;
      }

      if (data?.error) {
        if (isConflict(data.error)) {
          toast.info('Este e-mail já possui acesso a este cliente.');
          setEmail('');
          onOpenChange(false);
          return;
        }
        toast.error(data.error);
        return;
      }

      // Show credentials modal with the generated password
      setCredentials({ email: trimmed, password: data?.password ?? '' });
      setEmail('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar convite';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Criar Acesso ao Portal
            </DialogTitle>
            <DialogDescription>
              Gere as credenciais de acesso para <strong>{clientName}</strong>. Uma senha aleatória será criada e enviada por e-mail.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail do cliente</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="cliente@email.com"
                  className={`pl-10 ${error ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Gerar Acesso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {credentials && (
        <CredentialsModal
          open={!!credentials}
          onOpenChange={(open) => { if (!open) setCredentials(null); }}
          email={credentials.email}
          password={credentials.password}
          clientName={clientName}
        />
      )}
    </>
  );
}
