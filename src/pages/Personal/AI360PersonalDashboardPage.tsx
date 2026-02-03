import { Brain } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersonalContext } from '@/hooks/usePersonalAI360Agent';
import { AI360PersonalChatInterface } from '@/components/ai/AI360PersonalChatInterface';
import { AI360PersonalSummaryCards } from '@/components/ai/AI360PersonalSummaryCards';
import { PersonalHelpChatInterface } from '@/components/ai/PersonalHelpChatInterface';

export default function AI360PersonalDashboardPage() {
  const { data: context, isLoading: isLoadingContext } = usePersonalContext();

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meu Cérebro Operacional</h1>
            <p className="text-sm text-muted-foreground">
              Seu assistente de IA para vida pessoal e produtividade
            </p>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="help" className="space-y-4">
        <TabsList>
          <TabsTrigger value="help">Ajuda</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Pessoal</TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="space-y-4">
          <PersonalHelpChatInterface />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <AI360PersonalChatInterface />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <AI360PersonalSummaryCards summary={context} isLoading={isLoadingContext} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
