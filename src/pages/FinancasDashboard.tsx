import { SavingsManager } from '@/components/financas/SavingsManager';
import { EarningsSummary } from '@/components/financas/EarningsSummary';
import { FinanceChart } from '@/components/financas/FinanceChart';
import { DebtList } from '@/components/financas/DebtList';

export default function FinancasDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Earnings Summary Cards */}
      <EarningsSummary />

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Savings Manager */}
        <div className="lg:col-span-1">
          <SavingsManager />
        </div>

        {/* Finance Chart */}
        <div className="lg:col-span-2">
          <FinanceChart />
        </div>
      </div>

      {/* Debt List */}
      <DebtList />
    </div>
  );
}
