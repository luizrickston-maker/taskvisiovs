import { ProgressMeter } from '@/components/caixa/ProgressMeter';
import { ContasCriticas } from '@/components/caixa/ContasCriticas';
import { QuickIncomeForm } from '@/components/caixa/QuickIncomeForm';
import { QuickExpenseForm } from '@/components/caixa/QuickExpenseForm';

export default function CaixaDashboard() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Progress Meter - Full width on top */}
      <ProgressMeter />

      {/* Contas Críticas - Full width below */}
      <ContasCriticas />

      {/* Quick Forms - Side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <QuickIncomeForm />
        <QuickExpenseForm />
      </div>
    </div>
  );
}
