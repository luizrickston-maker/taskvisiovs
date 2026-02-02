import { SectionBoundary } from '@/components/SectionBoundary';
import { SavingsManager } from '@/components/financas/SavingsManager';
import { EarningsSummary } from '@/components/financas/EarningsSummary';
import { DebtList } from '@/components/financas/DebtList';
import { IncomeList } from '@/components/financas/IncomeList';
import { TransactionsFilter } from '@/components/financas/TransactionsFilter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, TrendingUp, PiggyBank, Receipt } from 'lucide-react';

export default function FinancasDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Finanças Pessoais</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus ganhos, dívidas e reservas</p>
        </div>
      </div>

      {/* Earnings Summary Cards */}
      <SectionBoundary name="Resumo de Ganhos">
        <EarningsSummary />
      </SectionBoundary>

      {/* Tabbed Content */}
      <Tabs defaultValue="ganhos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="ganhos" className="gap-2">
            <TrendingUp className="h-4 w-4 hidden sm:inline" />
            Ganhos
          </TabsTrigger>
          <TabsTrigger value="dividas" className="gap-2">
            <Receipt className="h-4 w-4 hidden sm:inline" />
            Dívidas
          </TabsTrigger>
          <TabsTrigger value="reservas" className="gap-2">
            <PiggyBank className="h-4 w-4 hidden sm:inline" />
            Reservas
          </TabsTrigger>
          <TabsTrigger value="transacoes" className="gap-2">
            <Wallet className="h-4 w-4 hidden sm:inline" />
            Transações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ganhos" className="space-y-4">
          <SectionBoundary name="Ganhos">
            <IncomeList />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="dividas" className="space-y-4">
          <SectionBoundary name="Dívidas">
            <DebtList />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="reservas" className="space-y-4">
          <SectionBoundary name="Reservas">
            <SavingsManager />
          </SectionBoundary>
        </TabsContent>

        <TabsContent value="transacoes" className="space-y-4">
          <SectionBoundary name="Transações">
            <TransactionsFilter />
          </SectionBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
