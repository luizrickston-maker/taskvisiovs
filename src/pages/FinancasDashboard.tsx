import { SectionBoundary } from '@/components/SectionBoundary';
import { SavingsManager } from '@/components/financas/SavingsManager';
import { EarningsSummary } from '@/components/financas/EarningsSummary';
import { DebtList } from '@/components/financas/DebtList';
import { TransactionsFilter } from '@/components/financas/TransactionsFilter';

export default function FinancasDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Earnings Summary Cards */}
      <SectionBoundary name="Resumo de Ganhos">
        <EarningsSummary />
      </SectionBoundary>

      {/* Savings Manager - Full width, adjusted size */}
      <SectionBoundary name="Reservas">
        <SavingsManager />
      </SectionBoundary>

      {/* Transactions Filter */}
      <SectionBoundary name="Transações">
        <TransactionsFilter />
      </SectionBoundary>

      {/* Debt List */}
      <SectionBoundary name="Dívidas">
        <DebtList />
      </SectionBoundary>
    </div>
  );
}
