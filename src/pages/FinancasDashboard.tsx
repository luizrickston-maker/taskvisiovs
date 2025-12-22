import { SavingsManager } from '@/components/financas/SavingsManager';
import { EarningsSummary } from '@/components/financas/EarningsSummary';
import { DebtList } from '@/components/financas/DebtList';
import { TransactionsFilter } from '@/components/financas/TransactionsFilter';

export default function FinancasDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Earnings Summary Cards */}
      <EarningsSummary />

      {/* Savings Manager - Full width, adjusted size */}
      <SavingsManager />

      {/* Transactions Filter */}
      <TransactionsFilter />

      {/* Debt List */}
      <DebtList />
    </div>
  );
}
