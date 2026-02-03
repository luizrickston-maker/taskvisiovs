import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryTable } from '@/components/financas/CategoryTable';
import {
  useUserIncomeCategories,
  useCreateUserIncomeCategory,
  useUpdateUserIncomeCategory,
  useDeleteUserIncomeCategory,
  useUserDebtCategories,
  useCreateUserDebtCategory,
  useUpdateUserDebtCategory,
  useDeleteUserDebtCategory,
} from '@/hooks/useFinanceCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { Tags, TrendingUp, CreditCard } from 'lucide-react';

export default function FinanceCategoryManagementPage() {
  // Income Categories
  const { data: incomeCategories = [], isLoading: isLoadingIncome } = useUserIncomeCategories();
  const createIncome = useCreateUserIncomeCategory();
  const updateIncome = useUpdateUserIncomeCategory();
  const deleteIncome = useDeleteUserIncomeCategory();

  // Debt Categories
  const { data: debtCategories = [], isLoading: isLoadingDebt } = useUserDebtCategories();
  const createDebt = useCreateUserDebtCategory();
  const updateDebt = useUpdateUserDebtCategory();
  const deleteDebt = useDeleteUserDebtCategory();

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Tags className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciar Categorias de Finanças</h1>
          <p className="text-muted-foreground">
            Personalize suas categorias de ganhos e dívidas para melhor organização financeira.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias de</span> Ganhos
          </TabsTrigger>
          <TabsTrigger value="debt" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias de</span> Dívidas
          </TabsTrigger>
        </TabsList>

        {/* Income Categories Tab */}
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                Categorias de Ganhos
              </CardTitle>
              <CardDescription>
                Organize suas fontes de renda com categorias personalizadas como Salário, Freelance, Investimentos, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingIncome ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <CategoryTable
                  categories={incomeCategories}
                  onCreateCategory={(data) => createIncome.mutate(data)}
                  onUpdateCategory={(id, data) => updateIncome.mutate({ id, ...data })}
                  onDeleteCategory={(id) => deleteIncome.mutate(id)}
                  isCreating={createIncome.isPending}
                  isUpdating={updateIncome.isPending}
                  isDeleting={deleteIncome.isPending}
                  emptyMessage="Nenhuma categoria de ganho criada. Clique em 'Nova Categoria' para começar."
                  dialogTitle="Nova categoria de ganho"
                  dialogDescription="Crie uma categoria para organizar seus ganhos."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debt Categories Tab */}
        <TabsContent value="debt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-destructive" />
                Categorias de Dívidas
              </CardTitle>
              <CardDescription>
                Classifique suas dívidas com categorias personalizadas como Cartão de Crédito, Empréstimo, Aluguel, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDebt ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <CategoryTable
                  categories={debtCategories}
                  onCreateCategory={(data) => createDebt.mutate(data)}
                  onUpdateCategory={(id, data) => updateDebt.mutate({ id, ...data })}
                  onDeleteCategory={(id) => deleteDebt.mutate(id)}
                  isCreating={createDebt.isPending}
                  isUpdating={updateDebt.isPending}
                  isDeleting={deleteDebt.isPending}
                  emptyMessage="Nenhuma categoria de dívida criada. Clique em 'Nova Categoria' para começar."
                  dialogTitle="Nova categoria de dívida"
                  dialogDescription="Crie uma categoria para organizar suas dívidas."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
