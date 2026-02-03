import { useState } from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAI360Context, useAIAgents } from '@/hooks/useAI360Agent';
import { AI360ChatInterface } from '@/components/ai/AI360ChatInterface';
import { AI360SummaryCards } from '@/components/ai/AI360SummaryCards';
import { AppHelpChatInterface } from '@/components/ai/AppHelpChatInterface';

export default function AI360DashboardPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  
  const { data: context, isLoading: isLoadingContext } = useAI360Context();
  const { data: agents, isLoading: isLoadingAgents } = useAIAgents();

  // Set default agent when agents load
  const defaultAgent = agents?.find(a => a.is_default);
  const currentAgentId = selectedAgentId ?? defaultAgent?.id;

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
        <TabsList>
          <TabsTrigger value="help">Ajuda</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard 360°</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
