import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  Calendar,
  Crown,
  Trash2,
  PauseCircle,
  PlayCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type Workspace = {
  id: string;
  name: string;
  plan: string;
  status: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type Client = {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
};

export default function WorkspaceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState({ name: '', plan: '' });

  const { data: workspace, isLoading: loadingWs } = useQuery({
    queryKey: ['super-admin-workspace', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Workspace;
    },
    enabled: !!id,
    onSuccess: (data) => {
      setEditWorkspace({ name: data.name, plan: data.plan });
    }
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['super-admin-ws-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', id!);
      if (error) throw error;
      return data as WorkspaceMember[];
    },
    enabled: !!id,
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['super-admin-ws-clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, workspace_id, name, email, company_name, is_active, created_at')
        .eq('workspace_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!id,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ status: newStatus })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-workspace', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-workspaces'] });
      toast.success(newStatus === 'active' ? 'Workspace reativado!' : 'Workspace suspenso!');
      setConfirmSuspend(false);
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('workspaces')
        .update({ 
          name: editWorkspace.name, 
          plan: editWorkspace.plan 
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-workspace', id] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-workspaces'] });
      toast.success('Workspace atualizado com sucesso!');
      setIsEditModalOpen(false);
    },
    onError: () => toast.error('Erro ao atualizar workspace'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('workspaces').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-workspaces'] });
      toast.success('Workspace deletado com sucesso!');
      navigate('/super-admin');
    },
    onError: () => toast.error('Erro ao deletar workspace'),
  });

  const isLoading = loadingWs || loadingMembers || loadingClients;

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      owner: 'Dono',
      admin: 'Admin',
      member: 'Membro',
    };
    return map[role] ?? role;
  };

  const roleColor = (role: string) => {
    if (role === 'owner') return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    if (role === 'admin') return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              {loadingWs ? '...' : workspace?.name}
            </h1>
            <p className="text-sm text-muted-foreground">Detalhes do workspace</p>
          </div>
        </div>

        {!loadingWs && workspace && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="w-4 h-4" />
              Editar
            </Button>
            {workspace.status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                onClick={() => setConfirmSuspend(true)}
              >
                <PauseCircle className="w-4 h-4" />
                Suspender
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                onClick={() => toggleStatusMutation.mutate('active')}
                disabled={toggleStatusMutation.isPending}
              >
                <PlayCircle className="w-4 h-4" />
                Reativar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="w-4 h-4" />
              Deletar
            </Button>
          </div>
        )}
      </div>

      {/* Workspace Info */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="w-5 h-5 text-primary" />
            Informações do Workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingWs ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : workspace ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Nome</p>
                <p className="font-semibold text-foreground">{workspace.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plano</p>
                <Badge variant={workspace.plan === 'free' ? 'secondary' : 'default'} className="capitalize">
                  {workspace.plan}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge
                  variant="outline"
                  className={workspace.status === 'active'
                    ? 'border-emerald-500/50 text-emerald-500'
                    : 'border-destructive/50 text-destructive'
                  }
                >
                  {workspace.status === 'active' ? (
                    <><CheckCircle className="w-3 h-3 mr-1" />Ativo</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" />Suspenso</>
                  )}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Criado em</p>
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {format(new Date(workspace.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5 text-primary" />
            Membros ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum membro encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Adicionado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <Crown className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{m.user_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColor(m.role)}>
                        {roleLabel(m.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(m.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Clients */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <UserCheck className="w-5 h-5 text-primary" />
            Clientes ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingClients ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : clients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.company_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={c.is_active
                          ? 'border-emerald-500/50 text-emerald-500'
                          : 'border-muted text-muted-foreground'
                        }
                      >
                        {c.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Suspend */}
      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspender Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              O workspace "<strong>{workspace?.name}</strong>" será marcado como suspenso. Você pode reativá-lo a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => toggleStatusMutation.mutate('suspended')}
            >
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. O workspace "<strong>{workspace?.name}</strong>" e todos os seus dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Workspace</DialogTitle>
            <DialogDescription>
              Altere as informações básicas do workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">Nome do Workspace</label>
              <Input
                id="edit-name"
                value={editWorkspace.name}
                onChange={(e) => setEditWorkspace({ ...editWorkspace, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-plan" className="text-sm font-medium">Plano</label>
              <Select 
                value={editWorkspace.plan} 
                onValueChange={(v) => setEditWorkspace({ ...editWorkspace, plan: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={() => updateWorkspaceMutation.mutate()}
              disabled={!editWorkspace.name || updateWorkspaceMutation.isPending}
            >
              {updateWorkspaceMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
