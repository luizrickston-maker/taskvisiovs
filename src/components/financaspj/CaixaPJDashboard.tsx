import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeftRight, FileText, Tag } from 'lucide-react';
import { CaixaResumo } from './CaixaResumo';
import { TransacoesLista } from './TransacoesLista';
import { ContasPagarLista } from './ContasPagarLista';
import { CaixaCategorias } from './CaixaCategorias';

export function CaixaPJDashboard() {
  return (
    <div className="space-y-5">
      {/* Summary cards always visible */}
      <CaixaResumo />

      {/* Tabs */}
      <Tabs defaultValue="transacoes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="transacoes" className="gap-1.5">
            <ArrowLeftRight className="w-4 h-4 hidden sm:inline" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="contas-pagar" className="gap-1.5">
            <FileText className="w-4 h-4 hidden sm:inline" />
            Contas a Pagar
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5">
            <Tag className="w-4 h-4 hidden sm:inline" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transacoes">
          <TransacoesLista />
        </TabsContent>

        <TabsContent value="contas-pagar">
          <ContasPagarLista />
        </TabsContent>

        <TabsContent value="categorias">
          <CaixaCategorias />
        </TabsContent>
      </Tabs>
    </div>
  );
}
