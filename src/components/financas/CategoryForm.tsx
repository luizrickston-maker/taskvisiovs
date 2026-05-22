import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, TrendingUp, CreditCard } from 'lucide-react';
import {
  useCreateUserIncomeCategory,
  useUpdateUserIncomeCategory,
  useCreateUserDebtCategory,
  useUpdateUserDebtCategory,
} from '@/hooks/useFinanceCategories';
import type { UserIncomeCategory, UserDebtCategory } from '@/types/database';

// =====================================================
// Schema de Validação
// =====================================================

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Nome é obrigatório' })
    .max(50, { message: 'Nome deve ter no máximo 50 caracteres' }),
  description: z
    .string()
    .trim()
    .max(200, { message: 'Descrição deve ter no máximo 200 caracteres' })
    .optional()
    .or(z.literal('')),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// =====================================================
// Props
// =====================================================

interface CategoryFormProps {
  open: boolean;
  categoryType: 'income' | 'debt';
  category?: UserIncomeCategory | UserDebtCategory;
  onClose: () => void;
}

// =====================================================
// Componente
// =====================================================

export function CategoryForm({
  open,
  categoryType,
  category,
  onClose,
}: CategoryFormProps) {
  const isEditing = !!category;

  // Hooks de mutação baseados no tipo
  const createIncome = useCreateUserIncomeCategory();
  const updateIncome = useUpdateUserIncomeCategory();
  const createDebt = useCreateUserDebtCategory();
  const updateDebt = useUpdateUserDebtCategory();

  // Determina qual mutação usar
  const createMutation = categoryType === 'income' ? createIncome : createDebt;
  const updateMutation = categoryType === 'income' ? updateIncome : updateDebt;

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Configuração do formulário
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Preenche o formulário ao editar
  useEffect(() => {
    if (open) {
      form.reset({
        name: category?.name || '',
        description: category?.description || '',
      });
    }
  }, [open, category, form]);

  // Submit handler
  const onSubmit = async (values: CategoryFormValues) => {
    const data = {
      name: values.name,
      description: values.description || undefined,
    };

    try {
      if (isEditing && category) {
        await updateMutation.mutateAsync({ id: category.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch {
      // Erro já tratado pelo hook com toast
    }
  };

  // Labels e descrições dinâmicas
  const labels = {
    income: {
      title: isEditing ? 'Editar Categoria de Ganho' : 'Nova Categoria de Ganho',
      description: isEditing
        ? 'Atualize as informações da categoria.'
        : 'Crie uma categoria para organizar seus ganhos.',
      icon: TrendingUp,
      iconClass: 'text-emerald-500 dark:text-emerald-400',
      placeholder: 'Ex: Salário, Freelance, Investimentos...',
    },
    debt: {
      title: isEditing ? 'Editar Categoria de Dívida' : 'Nova Categoria de Dívida',
      description: isEditing
        ? 'Atualize as informações da categoria.'
        : 'Crie uma categoria para organizar suas dívidas.',
      icon: CreditCard,
      iconClass: 'text-destructive',
      placeholder: 'Ex: Cartão de Crédito, Empréstimo, Aluguel...',
    },
  };

  const currentLabels = labels[categoryType];
  const Icon = currentLabels.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${currentLabels.iconClass}`} />
            {currentLabels.title}
          </DialogTitle>
          <DialogDescription>{currentLabels.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={currentLabels.placeholder}
                      autoFocus
                      disabled={isLoading}
                      maxLength={50}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Uma breve descrição da categoria..."
                      rows={3}
                      disabled={isLoading}
                      maxLength={200}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
