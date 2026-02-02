import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Plus, Key, Trash2, Edit2, Eye, EyeOff, Loader2, 
  AlertCircle, CheckCircle2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useAiApiKeys,
  useCreateAiApiKey,
  useUpdateAiApiKey,
  useDeleteAiApiKey,
  useToggleAiApiKeyStatus,
  maskApiKey,
  AI_PROVIDER_OPTIONS,
} from '@/hooks/useAiApiKeys';
import type { AiApiKey } from '@/types/ai';

export function ApiKeyManager() {
  const { toast } = useToast();
  const { data: apiKeys, isLoading } = useAiApiKeys();
  const createMutation = useCreateAiApiKey();
  const updateMutation = useUpdateAiApiKey();
  const deleteMutation = useDeleteAiApiKey();
  const toggleMutation = useToggleAiApiKeyStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<AiApiKey | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  // Form state
  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [label, setLabel] = useState('');

  const resetForm = () => {
    setProvider('openrouter');
    setApiKey('');
    setLabel('');
    setEditingKey(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (key: AiApiKey) => {
    setEditingKey(key);
    setProvider(key.provider);
    setApiKey(''); // Don't pre-fill the key for security
    setLabel(key.label ?? '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingKey) {
        await updateMutation.mutateAsync({
          id: editingKey.id,
          provider,
          ...(apiKey && { api_key: apiKey }), // Only update if provided
          label: label || null,
        });
        toast({
          title: 'Chave atualizada',
          description: 'A chave de API foi atualizada com sucesso.',
        });
      } else {
        await createMutation.mutateAsync({
          provider,
          api_key: apiKey,
          label: label || null,
        });
        toast({
          title: 'Chave cadastrada',
          description: 'A nova chave de API foi cadastrada com sucesso.',
        });
      }
      setFormOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a chave de API.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({
        title: 'Chave removida',
        description: 'A chave de API foi removida com sucesso.',
      });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a chave de API.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (key: AiApiKey) => {
    try {
      await toggleMutation.mutateAsync({ 
        id: key.id, 
        isActive: !key.is_active 
      });
      toast({
        title: key.is_active ? 'Chave desativada' : 'Chave ativada',
        description: `A chave foi ${key.is_active ? 'desativada' : 'ativada'} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status da chave.',
        variant: 'destructive',
      });
    }
  };

  const getProviderLabel = (providerValue: string) => {
    return AI_PROVIDER_OPTIONS.find(p => p.value === providerValue)?.label ?? providerValue;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chaves de API</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie suas chaves de API para provedores de IA externos.
          </p>
        </div>
        <Button onClick={openCreateForm} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Chave
        </Button>
      </div>

      {apiKeys && apiKeys.length > 0 ? (
        <div className="grid gap-3">
          {apiKeys.map((key) => (
            <Card key={key.id} className={`p-4 ${!key.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Key className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {key.label ?? getProviderLabel(key.provider)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getProviderLabel(key.provider)}
                      </Badge>
                      {key.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground font-mono">
                        {showKeyId === key.id ? key.api_key : maskApiKey(key.api_key)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)}
                      >
                        {showKeyId === key.id ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={key.is_active ?? false}
                    onCheckedChange={() => handleToggleStatus(key)}
                    disabled={toggleMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(key)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(key.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Key className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h4 className="font-medium text-muted-foreground mb-2">
            Nenhuma chave cadastrada
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione chaves de API para usar provedores de IA externos.
          </p>
          <Button onClick={openCreateForm} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Chave
          </Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKey ? 'Editar Chave de API' : 'Nova Chave de API'}
            </DialogTitle>
            <DialogDescription>
              {editingKey 
                ? 'Atualize as informações da chave de API.'
                : 'Cadastre uma nova chave de API para usar com seus agentes.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor *</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDER_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Nome/Rótulo</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Minha chave OpenAI"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">
                Chave de API {editingKey ? '(deixe vazio para manter)' : '*'}
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={editingKey ? '••••••••' : 'sk-...'}
                required={!editingKey}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingKey ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Chave de API?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Agentes que usam esta chave 
              passarão a usar a chave padrão do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
