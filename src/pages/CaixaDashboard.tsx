import { ProgressMeter } from '@/components/caixa/ProgressMeter';
import { ContasCriticas } from '@/components/caixa/ContasCriticas';
import { QuickIncomeForm } from '@/components/caixa/QuickIncomeForm';
import { QuickExpenseForm } from '@/components/caixa/QuickExpenseForm';

export default function CaixaDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Progress Meter - Full width on mobile, 1 col on larger */}
        <div className="md:col-span-2 lg:col-span-1">
          <ProgressMeter />
        </div>

        {/* Contas Críticas - Takes 2 cols on large screens */}
        <div className="lg:col-span-2">
          <ContasCriticas />
        </div>
      </div>

      {/* Quick Forms */}
      <div className="grid gap-6 md:grid-cols-2">
        <QuickIncomeForm />
        <QuickExpenseForm />
      </div>
    </div>
  );
}
