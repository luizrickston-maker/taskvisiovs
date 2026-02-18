import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Building2, Mail, Phone, Edit2, Trash2,
  UserCheck, UserX, ChevronRight, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ClientUsersPanel } from '@/components/clientes/ClientUsersPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  workspace_id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClientFormData {
  name: string;
  company_name: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm: ClientFormData = { name: '', company_name: '', email: '', phone: '', notes: '' };

// ─── Client Form Dialog ───────────────────────────────────────────────────────

function ClientFormDialog({
  open, onOpenChange, client, workspaceId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: Client | null;
  workspaceId: string;
  onSuccess: () => void;
}) {
  const isEdit = !!client;
  const [form, setForm] = useState<ClientFormData>(
    client ? {
      name: client.name,
      company_name: client.company_name ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      notes: client.notes ?? '',
    } : emptyForm
  );
  const [errors, setErrors] = useState<Partial<ClientFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const set = (field: keyof ClientFormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<ClientFormData> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'E-mail inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (isEdit && client) {
        const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
        if (error) throw error;
        toast.success('Cliente atualizado!');
      } else {
        const { error } = await supabase.from('clients').insert({ ...payload, workspace_id: workspaceId });
        if (error) throw error;
        toast.success('Cliente criado!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !isLoading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as informações do cliente.' : 'Preencha os dados do novo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="c-name">Nome *</Label>
            <Input id="c-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Nome do cliente" className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-company">Empresa</Label>
            <Input id="c-company" value={form.company_name} onChange={e => set('company_name', e.target.value)}
              placeholder="Nome da empresa (opcional)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com" className={errors.email ? 'border-destructive' : ''} />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="(11) 9 9999-9999" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-notes">Observações</Label>
            <Textarea id="c-notes" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Notas internas sobre o cliente..." rows={3} maxLength={500} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Client Detail Sheet ──────────────────────────────────────────────────────

function ClientDetailSheet({
  client, open, onOpenChange, workspaceId, onEdit,
}: {
  client: Client | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  onEdit: () => void;
}) {
  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{client.name[0].toUpperCase()}</span>
            </div>
            {client.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info */}
          <div className="space-y-3">
            {client.company_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{client.company_name}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{client.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Criado em {format(new Date(client.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          {client.notes && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3">{client.notes}</p>
            </div>
          )}

          {/* Portal Users */}
          <div className="border-t border-border pt-4">
            <ClientUsersPanel clientId={client.id} clientName={client.name} workspaceId={workspaceId} />
          </div>

          <div className="border-t border-border pt-4">
            <Button variant="outline" className="w-full gap-2" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
              Editar Cliente
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch workspace id for current user
  const { data: workspaceId } = useQuery({
    queryKey: ['my-workspace-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user!.id)
        .limit(1)
        .single();
      if (error) throw error;
      return data.workspace_id as string;
    },
    enabled: !!user?.id,
  });

  const clientsQueryKey = ['clients', workspaceId];

  const { data: clients = [], isLoading } = useQuery({
    queryKey: clientsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!workspaceId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('clients').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
      toast.success(is_active ? 'Cliente ativado!' : 'Cliente desativado!');
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsQueryKey });
      toast.success('Cliente excluído!');
      setDeletingId(null);
    },
    onError: () => toast.error('Erro ao excluir cliente'),
  });

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(s) ||
          (c.company_name?.toLowerCase().includes(s) ?? false) ||
          (c.email?.toLowerCase().includes(s) ?? false)
        );
      }
      return true;
    });
  }, [clients, search, statusFilter]);

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.is_active).length,
    inactive: clients.filter(c => !c.is_active).length,
  }), [clients]);

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: clientsQueryKey });

  const openEdit = (c: Client) => {
    setEditingClient(c);
    setSelectedClient(null);
    setFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-1">Gerencie os clientes do seu workspace e acesso ao portal</p>
          </div>
        </div>
        <Button onClick={() => { setEditingClient(null); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Ativos', value: stats.active, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Inativos', value: stats.inactive, icon: UserX, color: 'text-muted-foreground', bg: 'bg-muted/50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, empresa ou e-mail..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={statusFilter === f ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(f)}
                >
                  {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client List */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Clientes ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
              </p>
              {clients.length === 0 && (
                <Button className="mt-4" onClick={() => { setEditingClient(null); setFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer gap-3"
                  onClick={() => setSelectedClient(c)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{c.name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {c.company_name && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {c.company_name}
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 shrink-0" />
                            {c.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={c.is_active
                        ? 'border-emerald-500/50 text-emerald-500 text-xs'
                        : 'border-muted text-muted-foreground text-xs'
                      }
                    >
                      {c.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(c)}
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => toggleActiveMutation.mutate({ id: c.id, is_active: !c.is_active })}
                        title={c.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {c.is_active
                          ? <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                          : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        }
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setDeletingId(c.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Form */}
      {workspaceId && (
        <ClientFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          client={editingClient}
          workspaceId={workspaceId}
          onSuccess={handleRefresh}
        />
      )}

      {/* Client Detail Sheet */}
      {workspaceId && (
        <ClientDetailSheet
          client={selectedClient}
          open={!!selectedClient}
          onOpenChange={v => !v && setSelectedClient(null)}
          workspaceId={workspaceId}
          onEdit={() => selectedClient && openEdit(selectedClient)}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O cliente e todos os seus acessos ao portal serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
