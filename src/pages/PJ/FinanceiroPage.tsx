import { Wallet, Receipt, Calculator, Tags, Percent, ArrowLeftRight, HandCoins } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CostList } from '@/components/areapj/CostList';
import { PricingCalculator } from '@/components/areapj/PricingCalculator';
import { CostCategoryManager } from '@/components/areapj/CostCategoryManager';
import { PaymentFeeSettings } from '@/components/areapj/PaymentFeeSettings';
import { CaixaPJDashboard } from '@/components/financaspj/CaixaPJDashboard';
import { ContasReceberTab } from '@/components/cobrancas/ContasReceberTab';

export default function FinanceiroPage() {
  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Caixa, custos e precificação</p>
        </div>
      </div>

      <Tabs defaultValue="caixa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 max-w-2xl">
          <TabsTrigger value="caixa" className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="hidden sm:inline">Caixa</span>
          </TabsTrigger>
          <TabsTrigger value="receber" className="flex items-center gap-2">
            <HandCoins className="w-4 h-4" />
            <span className="hidden sm:inline">A Receber</span>
          </TabsTrigger>
          <TabsTrigger value="custos" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Custos</span>
          </TabsTrigger>
          <TabsTrigger value="precificador" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Precificador</span>
          </TabsTrigger>
          <TabsTrigger value="taxas" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            <span className="hidden sm:inline">Taxas</span>
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <Tags className="w-4 h-4" />
            <span className="hidden sm:inline">Categorias</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="caixa">
          <CaixaPJDashboard />
        </TabsContent>

        <TabsContent value="receber">
          <ContasReceberTab />
        </TabsContent>

        <TabsContent value="custos">
          <CostList />
        </TabsContent>

        <TabsContent value="precificador">
          <PricingCalculator />
        </TabsContent>

        <TabsContent value="taxas">
          <PaymentFeeSettings />
        </TabsContent>

        <TabsContent value="categorias">
          <CostCategoryManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
