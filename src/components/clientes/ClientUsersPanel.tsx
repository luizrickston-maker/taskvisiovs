import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteClientUserModal } from './InviteClientUserModal';

import { toast } from 'sonner';
import { UserPlus, UserMinus, Users, Mail, UserCheck } from 'lucide-react';
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


interface ClientUser {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface ClientUsersPanelProps {
  clientId: string;
  clientName: string;
  workspaceId: string;
}

export function ClientUsersPanel({ clientId, clientName, workspaceId }: ClientUsersPanelProps) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

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
      toast.success('Acesso revogado com sucesso!');
      setRevokingId(null);
    },
    onError: () => {
      toast.error('Erro ao revogar acesso');
      setRevokingId(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (user: ClientUser) => {
      const { error } = await supabase
        .from('client_users')
        .update({ is_active: true })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Acesso reativado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao reativar acesso');
    },
  });

  const activeUsers = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="w-4 h-4 text-primary" />
          <span>Usuários do Portal</span>
          {activeUsers.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeUsers.length} ativo{activeUsers.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Convidar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum usuário com acesso ainda.</p>
          <p>Clique em "Convidar" para conceder acesso ao portal.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {activeUsers.map(user => (
            <div
              key={user.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {user.email[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-foreground truncate">{user.email}</span>
                <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-500 shrink-0">Ativo</Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => setRevokingId(user.id)}
              >
                <UserMinus className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {inactiveUsers.length > 0 && (
            <div className="space-y-1 mt-1">
              {inactiveUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/20 border border-border/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs truncate text-muted-foreground">{user.email}</span>
                    <Badge variant="outline" className="text-xs shrink-0">Inativo</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
                    onClick={() => reactivateMutation.mutate(user)}
                    disabled={reactivateMutation.isPending}
                  >
                    <UserCheck className="w-3 h-3" />
                    Ativar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá o acesso ao portal de <strong>{clientName}</strong>. Você pode reconvidar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => revokingId && revokeMutation.mutate(revokingId)}
            >
              <UserMinus className="w-4 h-4 mr-1" />
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
