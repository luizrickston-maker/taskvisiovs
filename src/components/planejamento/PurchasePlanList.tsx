import { useAppStore } from '@/stores/useAppStore';
import { PurchasePlanCard } from './PurchasePlanCard';
import { ShoppingBag } from 'lucide-react';

export function PurchasePlanList() {
  const { purchasePlans } = useAppStore();

  // Sort: in_progress first, then planning, then completed. Within each, sort by deadline
  const sortedPlans = [...purchasePlans].sort((a, b) => {
    const statusOrder = { in_progress: 0, planning: 1, completed: 2 };
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    
    // Sort by deadline (nulls last)
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  if (sortedPlans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Nenhum plano de compra</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Comece a planejar suas próximas aquisições clicando em "Novo Plano"
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedPlans.map((plan) => (
        <PurchasePlanCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
