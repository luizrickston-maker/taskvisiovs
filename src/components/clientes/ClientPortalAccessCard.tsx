import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteClientUserModal } from './InviteClientUserModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Globe, UserPlus, UserMinus, RefreshCw, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';

interface ClientUser {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface ClientPortalAccessCardProps {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  workspaceId: string;
}

export function ClientPortalAccessCard({
  clientId,
  clientName,
  clientEmail,
  workspaceId,
}: ClientPortalAccessCardProps) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const queryKey = ['client-users', clientId];

  const { data: users = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('id, user_id, email, is_active, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientUser[];
    },
    enabled: !!clientId,
  });

  const revokeMutation = useMutation({
    mutationFn: async (clientUserId: string) => {
      const { error } = await supabase
        .from('client_users')
        .update({ is_active: false })
        .eq('id', clientUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Acesso ao portal desativado.');
      setRevokingId(null);
    },
    onError: () => {
      toast.error('Erro ao revogar acesso.');
      setRevokingId(null);
    },
  });

  const handleResend = async (userEmail: string) => {
    setResendingId(userEmail);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('invite-client-user', {
        body: { email: userEmail, clientId, workspaceId },
      });
      if (fnError) throw fnError;
      if (data?.error && !data.error.includes('already has access')) throw new Error(data.error);
      toast.success(`Convite reenviado para ${userEmail}!`);
    } catch {
      toast.error('Erro ao reenviar convite.');
    } finally {
      setResendingId(null);
    }
  };

  const activeUsers = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Acesso ao Portal
            </CardTitle>
            {!isLoading && activeUsers.length > 0 && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 text-xs gap-1">
                <ShieldCheck className="w-3 h-3" />
                {activeUsers.length} ativo{activeUsers.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : users.length === 0 ? (
            /* No access yet */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <ShieldOff className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhum acesso gerado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gere um acesso para que o cliente possa acessar o portal.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Gerar Acesso ao Portal
              </Button>
            </div>
          ) : (
            /* Users list */
            <div className="space-y-3">
              {activeUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{user.email[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{user.email}</p>
                      <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-500 mt-0.5">
                        Ativo
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground text-xs"
                      onClick={() => handleResend(user.email)}
                      disabled={resendingId === user.email}
                      title="Reenviar convite"
                    >
                      {resendingId === user.email
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />
                      }
                      <span className="hidden sm:inline">Reenviar</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setRevokingId(user.id)}
                      title="Desativar acesso"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {inactiveUsers.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none hover:text-foreground transition-colors py-1">
                    {inactiveUsers.length} acesso{inactiveUsers.length !== 1 ? 's' : ''} desativado{inactiveUsers.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="space-y-1 mt-2">
                    {inactiveUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between px-3 py-2 rounded-lg opacity-50 bg-muted/20 border border-border/30">
                        <span className="truncate">{user.email}</span>
                        <Badge variant="outline" className="text-xs border-muted text-muted-foreground">Inativo</Badge>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2 mt-2"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Usuário
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteClientUserModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        clientId={clientId}
        clientName={clientName}
        workspaceId={workspaceId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey })}
      />

      <AlertDialog open={!!revokingId} onOpenChange={() => setRevokingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá o acesso ao portal de <strong>{clientName}</strong>. Você pode reativar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => revokingId && revokeMutation.mutate(revokingId)}
            >
              <UserMinus className="w-4 h-4 mr-1" />
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
