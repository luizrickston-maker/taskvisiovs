import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Bot, Key, Loader2, Sparkles, Cpu, Zap, ArrowLeft } from 'lucide-react';
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
import { useAiApiKeys } from '@/hooks/useAiApiKeys';
import type { AIAgent, AIAgentCreate } from '@/types/ai';

export default function AiAgentsManagerPage() {
  const { toast } = useToast();
  const { data: agents, isLoading } = useAiAgents();
  const { data: apiKeys } = useAiApiKeys();
  const createMutation = useCreateAiAgent();
  const updateMutation = useUpdateAiAgent();
  const deleteMutation = useDeleteAiAgent();
  const setDefaultMutation = useSetDefaultAgent();
  const toggleActiveMutation = useToggleAgentActive();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // KPI calculations
  const totalAgents = agents?.length ?? 0;
  const activeAgents = agents?.filter(a => a.is_active).length ?? 0;
  const totalApiKeys = apiKeys?.length ?? 0;
  const activeApiKeys = apiKeys?.filter(k => k.is_active).length ?? 0;

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
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Professional Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agentes de IA</h1>
            <p className="text-muted-foreground text-sm">
              Configure e gerencie seus agentes de inteligência artificial
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAgents}</p>
                <p className="text-xs text-muted-foreground">Total de Agentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Cpu className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeAgents}</p>
                <p className="text-xs text-muted-foreground">Agentes Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Key className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalApiKeys}</p>
                <p className="text-xs text-muted-foreground">Chaves de API</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Zap className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeApiKeys}</p>
                <p className="text-xs text-muted-foreground">Chaves Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Card className="glass-card">
        <Tabs defaultValue="agents" className="w-full">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="agents" className="gap-2 text-sm">
                  <Bot className="w-4 h-4" />
                  <span className="hidden sm:inline">Agentes</span>
                </TabsTrigger>
                <TabsTrigger value="keys" className="gap-2 text-sm">
                  <Key className="w-4 h-4" />
                  <span className="hidden sm:inline">Chaves API</span>
                </TabsTrigger>
              </TabsList>
              
              <Button onClick={handleCreate} size="sm" className="sm:w-auto w-full">
                <Plus className="w-4 h-4 mr-2" />
                Novo Agente
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Agents Tab */}
            <TabsContent value="agents" className="mt-0 space-y-4">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-56 rounded-xl" />
                  ))}
                </div>
              ) : agents && agents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="text-center py-12 px-4">
                  <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                    <Bot className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum agente configurado
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
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
            <TabsContent value="keys" className="mt-0">
              <ApiKeyManager />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

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
