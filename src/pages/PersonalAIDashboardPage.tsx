import { Heart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersonalContext } from '@/hooks/usePersonalAI360Agent';
import { PersonalAI360ChatInterface } from '@/components/ai/PersonalAI360ChatInterface';
import { PersonalAI360SummaryCards } from '@/components/ai/PersonalAI360SummaryCards';

export default function PersonalAIDashboardPage() {
  const { data: context, isLoading: isLoadingContext } = usePersonalContext();

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20">
            <Heart className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assistente Pessoal 360°</h1>
            <p className="text-sm text-muted-foreground">
              Seu assistente de IA para vida pessoal e produtividade
            </p>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard Pessoal</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <PersonalAI360ChatInterface />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <PersonalAI360SummaryCards summary={context} isLoading={isLoadingContext} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
