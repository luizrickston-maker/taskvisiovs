import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Bot, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AiAgentCard } from '@/components/ai/AiAgentCard';
import { AiAgentForm } from '@/components/ai/AiAgentForm';
import { ApiKeyManager } from '@/components/ai/ApiKeyManager';
import {
  useAiAgents,
  useCreateAiAgent,
  useUpdateAiAgent,
  useDeleteAiAgent,
  useSetDefaultAgent,
  useToggleAgentActive,
} from '@/hooks/useAiAgents';
import type { AIAgent, AIAgentCreate } from '@/types/ai';

export default function AiAgentsManagerPage() {
  const { toast } = useToast();
  const { data: agents, isLoading } = useAiAgents();
  const createMutation = useCreateAiAgent();
  const updateMutation = useUpdateAiAgent();
  const deleteMutation = useDeleteAiAgent();
  const setDefaultMutation = useSetDefaultAgent();
  const toggleActiveMutation = useToggleAgentActive();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingAgent(null);
    setFormOpen(true);
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormOpen(true);
  };

  const handleSubmit = async (data: AIAgentCreate) => {
    try {
      if (editingAgent) {
        await updateMutation.mutateAsync({ id: editingAgent.id, ...data });
        toast({
          title: 'Agente atualizado',
          description: 'O agente de IA foi atualizado com sucesso.',
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: 'Agente criado',
          description: 'O novo agente de IA foi criado com sucesso.',
        });
      }
      setFormOpen(false);
      setEditingAgent(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o agente de IA.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({
        title: 'Agente removido',
        description: 'O agente de IA foi removido com sucesso.',
      });
      setDeleteId(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o agente de IA.',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync(id);
      toast({
        title: 'Agente padrão definido',
        description: 'Este agente será usado como padrão.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível definir o agente padrão.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (agent: AIAgent) => {
    try {
      await toggleActiveMutation.mutateAsync({ 
        id: agent.id, 
        isActive: !agent.is_active 
      });
      toast({
        title: agent.is_active ? 'Agente desativado' : 'Agente ativado',
        description: `O agente foi ${agent.is_active ? 'desativado' : 'ativado'} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do agente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agentes de IA</h1>
          <p className="text-muted-foreground">
            Configure e gerencie seus agentes de inteligência artificial.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="agents" className="gap-2">
            <Bot className="w-4 h-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="w-4 h-4" />
            Chaves de API
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Agente
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AiAgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleEdit}
                  onDelete={setDeleteId}
                  onToggleActive={handleToggleActive}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Bot className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum agente configurado
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie seu primeiro agente de IA para automatizar tarefas e obter 
                insights personalizados sobre suas operações.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </div>
          )}
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys">
          <div className="glass-card p-6">
            <ApiKeyManager />
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent Form Dialog */}
      <AiAgentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={editingAgent}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Agente de IA?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente será permanentemente 
              removido e não poderá mais ser utilizado.
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
