import { useState } from 'react';
import { CalendarDays, CheckSquare, Inbox } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionBoundary } from '@/components/SectionBoundary';
import InboxMental from '@/components/foco/InboxMental';
import AcoesHoje from '@/components/foco/AcoesHoje';
import Agenda48h from '@/components/foco/Agenda48h';
import ActivityHistory from '@/components/foco/ActivityHistory';

export default function FocoDashboard() {
  const [activeTab, setActiveTab] = useState('acoes');

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Meu Dia</h1>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="acoes" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Ações</span>
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <span className="hidden sm:inline">Inbox</span>
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Agenda</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acoes" className="mt-6">
          <SectionBoundary name="Ações de Hoje">
            <AcoesHoje />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="inbox" className="mt-6">
          <SectionBoundary name="Inbox Mental">
            <InboxMental />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="agenda" className="mt-6 space-y-6">
          <SectionBoundary name="Agenda 48h">
            <Agenda48h />
          </SectionBoundary>
          
          <SectionBoundary name="Histórico">
            <ActivityHistory />
          </SectionBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
