import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  CheckCircle2, XCircle 
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
    setApiKey('');
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
          ...(apiKey && { api_key: apiKey }),
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Chaves de API</h3>
          <p className="text-xs text-muted-foreground">
            Gerencie suas chaves para provedores de IA externos.
          </p>
        </div>
        <Button onClick={openCreateForm} size="sm" className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nova Chave
        </Button>
      </div>

      {/* Keys List */}
      {apiKeys && apiKeys.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {apiKeys.map((key) => (
            <Card 
              key={key.id} 
              className={`transition-opacity ${!key.is_active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <Key className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {key.label ?? getProviderLabel(key.provider)}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {getProviderLabel(key.provider)}
                        </Badge>
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

                  {/* Status Icon */}
                  <div className="shrink-0">
                    {key.is_active ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <Switch
                    checked={key.is_active ?? false}
                    onCheckedChange={() => handleToggleStatus(key)}
                    disabled={toggleMutation.isPending}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditForm(key)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(key.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4">
          <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
            <Key className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h4 className="font-semibold text-muted-foreground mb-2">
            Nenhuma chave cadastrada
          </h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Adicione chaves de API para usar provedores de IA externos.
          </p>
          <Button onClick={openCreateForm} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Chave
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
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

            <DialogFooter className="gap-2 sm:gap-0">
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
