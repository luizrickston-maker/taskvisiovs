import { useState } from 'react';
import { Brain, Sparkles, Bot, Key, Plus, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/hooks/use-toast';
import { useAI360Context, useAIAgents } from '@/hooks/useAI360Agent';
import {
  useAiAgents,
  useCreateAiAgent,
  useUpdateAiAgent,
  useDeleteAiAgent,
  useSetDefaultAgent,
  useToggleAgentActive,
} from '@/hooks/useAiAgents';
import { AI360ChatInterface } from '@/components/ai/AI360ChatInterface';
import { AI360SummaryCards } from '@/components/ai/AI360SummaryCards';
import { AppHelpChatInterface } from '@/components/ai/AppHelpChatInterface';
import { AiAgentCard } from '@/components/ai/AiAgentCard';
import { AiAgentForm } from '@/components/ai/AiAgentForm';
import { ApiKeyManager } from '@/components/ai/ApiKeyManager';
import type { AIAgent, AIAgentCreate } from '@/types/ai';

export default function AI360DashboardPage() {
  const { toast } = useToast();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  
  const { data: context, isLoading: isLoadingContext } = useAI360Context();
  const { data: agents, isLoading: isLoadingAgents } = useAIAgents();

  // Agent management
  const { data: allAgents, isLoading: isLoadingAllAgents } = useAiAgents();
  const createMutation = useCreateAiAgent();
  const updateMutation = useUpdateAiAgent();
  const deleteMutation = useDeleteAiAgent();
  const setDefaultMutation = useSetDefaultAgent();
  const toggleActiveMutation = useToggleAgentActive();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Set default agent when agents load
  const defaultAgent = agents?.find(a => a.is_default);
  const currentAgentId = selectedAgentId ?? defaultAgent?.id;

  // Agent handlers
  const handleCreateAgent = () => {
    setEditingAgent(null);
    setFormOpen(true);
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormOpen(true);
  };

  const handleSubmitAgent = async (data: AIAgentCreate) => {
    try {
      if (editingAgent) {
        await updateMutation.mutateAsync({ id: editingAgent.id, ...data });
        toast({ title: 'Agente atualizado', description: 'O agente de IA foi atualizado com sucesso.' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: 'Agente criado', description: 'O novo agente de IA foi criado com sucesso.' });
      }
      setFormOpen(false);
      setEditingAgent(null);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar o agente de IA.', variant: 'destructive' });
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: 'Agente removido', description: 'O agente de IA foi removido com sucesso.' });
      setDeleteId(null);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível remover o agente de IA.', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync(id);
      toast({ title: 'Agente padrão definido' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível definir o agente padrão.', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (agent: AIAgent) => {
    try {
      await toggleActiveMutation.mutateAsync({ id: agent.id, isActive: !agent.is_active });
      toast({ title: agent.is_active ? 'Agente desativado' : 'Agente ativado' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status do agente.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cérebro Operacional</h1>
            <p className="text-sm text-muted-foreground">
              Assistente de IA 360° para suas operações
            </p>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <Select
            value={currentAgentId}
            onValueChange={setSelectedAgentId}
            disabled={isLoadingAgents}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar agente..." />
            </SelectTrigger>
            <SelectContent>
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{agent.name}</span>
                    {agent.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Padrão
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="help" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="help">Ajuda</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard 360°</TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5">
            <Key className="w-3.5 h-3.5" />
            Chaves API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="space-y-4">
          <AppHelpChatInterface agentId={currentAgentId} />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <AI360ChatInterface agentId={currentAgentId} />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <AI360SummaryCards summary={context} isLoading={isLoadingContext} />
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Agentes de IA</h2>
              <p className="text-sm text-muted-foreground">Configure e gerencie seus agentes</p>
            </div>
            <Button onClick={handleCreateAgent} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Novo Agente
            </Button>
          </div>

          {isLoadingAllAgents ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : allAgents && allAgents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allAgents.map((agent) => (
                <AiAgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleEditAgent}
                  onDelete={setDeleteId}
                  onToggleActive={handleToggleActive}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Bot className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum agente configurado</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
                Crie seu primeiro agente de IA para automatizar tarefas e obter insights personalizados.
              </p>
              <Button onClick={handleCreateAgent}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </div>
          )}
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <ApiKeyManager />
        </TabsContent>
      </Tabs>

      {/* Agent Form Dialog */}
      <AiAgentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={editingAgent}
        onSubmit={handleSubmitAgent}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Agente de IA?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}