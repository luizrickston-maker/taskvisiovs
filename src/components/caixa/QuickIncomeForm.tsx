import { useState } from "react";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { handleSupabaseError } from "@/lib/error-handler";
import type { Income } from "@/types/database";

const quickIncomeSchema = z.object({
  source: z.string().min(1, "Fonte é obrigatória").max(100, "Fonte muito longa"),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Valor deve ser maior que zero",
  }),
  categoryId: z.string().optional(),
});

type QuickIncomeValues = z.infer<typeof quickIncomeSchema>;


export function QuickIncomeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<QuickIncomeValues>({
    resolver: zodResolver(quickIncomeSchema),
    defaultValues: {
      source: "",
      amount: "",
      categoryId: "",
    }
  });

  const categoryId = watch("categoryId");

  
  const { user } = useAuthContext();
  const { incomes = [], categories = [], addIncome, deleteIncome } = useAppStore();

  const incomeCategories = categories.filter((c) => c.type === "income");
  const todayIncomes = incomes.filter((i) => isToday(parseISO(i.date)));

  const todayTotal = todayIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const onSubmit = async (values: QuickIncomeValues) => {
    if (!user) return;

    setIsSubmitting(true);

    const newIncome = {
      user_id: user.id,
      source: values.source.trim(),
      amount: parseFloat(values.amount),
      date: format(new Date(), "yyyy-MM-dd"),
      category_id: values.categoryId || null,
      income_type: "fixed",
    };

    const data = await handleSupabaseError<any>(
      supabase
        .from("incomes")
        .insert(newIncome as any)
        .select()
        .single() as any,
      "Erro ao adicionar entrada"
    );

    setIsSubmitting(false);

    if (data) {
      addIncome(data as Income);
      reset();
      toast.success("Entrada adicionada!");
    }
  };

  const handleDelete = async (id: string) => {
    const success = await handleSupabaseError<any>(
      supabase.from('incomes').delete().eq('id', id) as any,
      'Erro ao remover entrada'
    );

    if (success !== null) {
      deleteIncome(id);
      toast.success("Entrada removida");
    }
  };


  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Entradas de Hoje
          </div>
          <span className="text-success font-bold">{formatCurrency(todayTotal)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2" aria-label="Adicionar entrada rápida">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Fonte"
                {...register("source")}
                className={errors.source ? "border-destructive" : ""}
                aria-label="Fonte da entrada"
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor"
                {...register("amount")}
                className={errors.amount ? "border-destructive" : ""}
                aria-label="Valor da entrada"
              />
            </div>
            <Select 
              value={categoryId} 
              onValueChange={(val) => setValue("categoryId", val)}
            >
              <SelectTrigger className="w-32" aria-label="Selecionar categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden="true"
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="icon" disabled={isSubmitting} aria-label="Adicionar entrada">
              <Plus className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
          {(errors.source || errors.amount) && (
            <p className="text-[10px] text-destructive font-medium px-1">
              {errors.source?.message || errors.amount?.message}
            </p>
          )}
        </form>


        <ScrollArea className="h-[180px]">
          {todayIncomes.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma entrada hoje
            </p>
          ) : (
            <div className="space-y-2">
              {todayIncomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 group"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(income.category_id) }}
                  />
                  <span className="flex-1 truncate">{income.source}</span>
                  <span className="font-medium text-success">
                    {formatCurrency(Number(income.amount))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 transition-opacity"
                    onClick={() => handleDelete(income.id)}
                    aria-label={`Excluir entrada ${income.source}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
