import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Building2, Mail, Phone, Edit2, Trash2,
  UserCheck, UserX, ChevronRight, Loader2, Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [generatePortalAccess, setGeneratePortalAccess] = useState(false);

  const set = (field: keyof ClientFormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<ClientFormData> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = 'E-mail inválido';
    if (!isEdit && generatePortalAccess && !form.email.trim())
      e.email = 'E-mail é obrigatório para gerar acesso ao portal';
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
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert({ ...payload, workspace_id: workspaceId })
          .select('id')
          .single();
        if (error) throw error;

        if (generatePortalAccess && form.email.trim() && newClient) {
          const { data, error: fnError } = await supabase.functions.invoke('invite-client-user', {
            body: { email: form.email.trim().toLowerCase(), clientId: newClient.id, workspaceId },
          });
          if (fnError) throw fnError;
          if (data?.error) throw new Error(data.error);
          toast.success(
            data?.invited
              ? `Cliente criado e convite enviado para ${form.email.trim()}!`
              : `Cliente criado com acesso ao portal gerado!`
          );
        } else {
          toast.success('Cliente criado!');
        }
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already has access')) {
        toast.warning('Cliente criado, mas este e-mail já possui acesso ao portal.');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error('Erro ao salvar cliente. Tente novamente.');
      }
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

          {!isEdit && (
            <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
              <Checkbox
                id="portal-access"
                checked={generatePortalAccess}
                onCheckedChange={(checked) => setGeneratePortalAccess(checked === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="portal-access" className="cursor-pointer font-medium text-sm">
                  Gerar acesso ao Portal do Cliente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Um e-mail de convite será enviado para o cliente acessar o portal.
                </p>
              </div>
            </div>
          )}

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

export default function ClientesFinaisPage() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [portalFilter, setPortalFilter] = useState<'all' | 'with_portal' | 'no_portal'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: workspaceId } = useQuery({
    queryKey: ['my-workspace-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_workspace_id');
      if (error) throw error;
      return data as string | null;
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

  const { data: portalUserCounts = {} } = useQuery({
    queryKey: ['clients-portal-counts', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('client_id, is_active')
        .eq('workspace_id', workspaceId!);
      if (error) throw error;
      const counts: Record<string, { total: number; active: number }> = {};
      for (const row of data) {
        if (!counts[row.client_id]) counts[row.client_id] = { total: 0, active: 0 };
        counts[row.client_id].total++;
        if (row.is_active) counts[row.client_id].active++;
      }
      return counts;
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
      const portalCount = portalUserCounts[c.id];
      if (portalFilter === 'with_portal' && (!portalCount || portalCount.active === 0)) return false;
      if (portalFilter === 'no_portal' && portalCount && portalCount.active > 0) return false;
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
  }, [clients, search, statusFilter, portalFilter, portalUserCounts]);

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.is_active).length,
    withPortal: clients.filter(c => portalUserCounts[c.id]?.active > 0).length,
  }), [clients, portalUserCounts]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: clientsQueryKey });
    queryClient.invalidateQueries({ queryKey: ['clients-portal-counts', workspaceId] });
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
            <p className="text-muted-foreground mt-1">Gerencie os clientes e acesso ao portal</p>
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
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Ativos', value: stats.active, color: 'text-emerald-500' },
          { label: 'Com Portal', value: stats.withPortal, color: 'text-primary' },
        ].map(stat => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, empresa ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={statusFilter === f ? 'default' : 'outline'}
              onClick={() => setStatusFilter(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </Button>
          ))}
          <Button
            size="sm"
            variant={portalFilter === 'with_portal' ? 'default' : 'outline'}
            onClick={() => setPortalFilter(p => p === 'with_portal' ? 'all' : 'with_portal')}
            className="text-xs gap-1"
          >
            <Globe className="w-3 h-3" />
            Com Portal
          </Button>
        </div>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {search || statusFilter !== 'all' || portalFilter !== 'all'
                  ? 'Nenhum cliente encontrado'
                  : 'Nenhum cliente cadastrado'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all' || portalFilter !== 'all'
                  ? 'Tente ajustar os filtros.'
                  : 'Adicione seu primeiro cliente clicando em "Novo Cliente".'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const portalCount = portalUserCounts[c.id];
            const hasActivePortal = portalCount?.active > 0;
            return (
              <Card
                key={c.id}
                className="glass-card hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/comercial/clientes/${c.id}`)}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{c.name[0].toUpperCase()}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{c.name}</span>
                        {hasActivePortal && (
                           <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <Badge
                          variant="outline"
                          className={c.is_active
                            ? 'border-emerald-500/40 text-emerald-500 text-xs'
                            : 'border-muted text-muted-foreground text-xs'
                          }
                        >
                          {c.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {c.company_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {c.company_name}
                          </span>
                        )}
                        {c.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {c.email}
                          </span>
                        )}
                        {c.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {c.phone}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toggleActiveMutation.mutate({ id: c.id, is_active: !c.is_active })}
                        disabled={toggleActiveMutation.isPending}
                      >
                        {c.is_active ? <UserX className="w-4 h-4 text-muted-foreground" /> : <UserCheck className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => { setEditingClient(c); setFormOpen(true); }}
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                        onClick={() => setDeletingId(c.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {workspaceId && (
        <ClientFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          client={editingClient}
          workspaceId={workspaceId}
          onSuccess={handleRefresh}
        />
      )}

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
