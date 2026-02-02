import { SectionBoundary } from '@/components/SectionBoundary';
import { SavingsManager } from '@/components/financas/SavingsManager';
import { EarningsSummary } from '@/components/financas/EarningsSummary';
import { DebtList } from '@/components/financas/DebtList';
import { IncomeList } from '@/components/financas/IncomeList';
import { TransactionsFilter } from '@/components/financas/TransactionsFilter';

export default function FinancasDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Earnings Summary Cards */}
      <SectionBoundary name="Resumo de Ganhos">
        <EarningsSummary />
      </SectionBoundary>

      {/* Income and Debt Management - Side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionBoundary name="Ganhos">
          <IncomeList />
        </SectionBoundary>

        <SectionBoundary name="Dívidas">
          <DebtList />
        </SectionBoundary>
      </div>

      {/* Savings Manager */}
      <SectionBoundary name="Reservas">
        <SavingsManager />
      </SectionBoundary>

      {/* Transactions Filter */}
      <SectionBoundary name="Transações">
        <TransactionsFilter />
      </SectionBoundary>
    </div>
  );
}
