import { TrendingUp } from 'lucide-react';
import { InvestmentManager } from '@/components/areapj/InvestmentManager';

export default function InvestimentosPage() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Investimentos</h1>
          <p className="text-sm text-muted-foreground">Controle de gastos e investimentos da empresa</p>
        </div>
      </div>

      <InvestmentManager />
    </div>
  );
}
