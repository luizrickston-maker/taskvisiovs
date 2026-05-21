import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Edit2, Trash2, UserCheck, UserX, History, Video } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { ClientInfoCard } from '@/components/clientes/ClientInfoCard';
import { ClientPortalAccessCard } from '@/components/clientes/ClientPortalAccessCard';
import { ClientContentsCard } from '@/components/clientes/ClientContentsCard';
import { ClientContentCalendarPreview } from '@/components/clientes/ClientContentCalendarPreview';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientVideoSettings } from "@/components/clientes/ClientVideoSettings";

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

function EditClientDialog({
  open, onOpenChange, client, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Client;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<ClientFormData>({
    name: client.name,
    company_name: client.company_name ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    notes: client.notes ?? '',
  });
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
      const { error } = await supabase.from('clients').update({
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      }).eq('id', client.id);
      if (error) throw error;
      toast.success('Cliente atualizado!');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !isLoading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Atualize as informações do cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="e-name">Nome *</Label>
            <Input id="e-name" value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Nome do cliente" className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-company">Empresa</Label>
            <Input id="e-company" value={form.company_name} onChange={e => set('company_name', e.target.value)}
              placeholder="Nome da empresa (opcional)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="e-email">E-mail</Label>
              <Input id="e-email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@exemplo.com" className={errors.email ? 'border-destructive' : ''} />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-phone">Telefone</Label>
              <Input id="e-phone" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="(11) 9 9999-9999" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-notes">Observações</Label>
            <Textarea id="e-notes" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Notas internas..." rows={3} maxLength={500} />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientFinalDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const clientQueryKey = ['client', id];

  const { data: client, isLoading, error } = useQuery({
    queryKey: clientQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (is_active: boolean) => {
      const { error } = await supabase.from('clients').update({ is_active }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, is_active) => {
      queryClient.invalidateQueries({ queryKey: clientQueryKey });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(is_active ? 'Cliente ativado!' : 'Cliente desativado!');
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('clients').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente excluído!');
      navigate('/comercial/clientes');
    },
    onError: () => toast.error('Erro ao excluir cliente'),
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center gap-4 min-h-64">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/comercial/clientes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/comercial/clientes')} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-foreground">{client.name}</h1>
            </div>
            {client.company_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{client.company_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => toggleActiveMutation.mutate(!client.is_active)}
            disabled={toggleActiveMutation.isPending}
          >
            {client.is_active
              ? <><UserX className="w-4 h-4" />Desativar</>
              : <><UserCheck className="w-4 h-4" />Ativar</>
            }
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="w-4 h-4" /> Módulo de Vídeo
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ClientInfoCard client={client} />
              <ClientContentCalendarPreview workspaceId={client.workspace_id} clientId={client.id} />
              <ClientContentsCard clientId={client.id} workspaceId={client.workspace_id} />
            </div>
            <div>
              <ClientPortalAccessCard
                clientId={client.id}
                clientName={client.name}
                clientEmail={client.email}
                workspaceId={client.workspace_id}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <ClientVideoSettings clientId={id!} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Interações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8 italic">Nenhuma interação registrada recentemente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editOpen && (
        <EditClientDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          client={client}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: clientQueryKey })}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. <strong>{client.name}</strong> e todos os seus acessos ao portal serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deleteMutation.mutate()}
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
