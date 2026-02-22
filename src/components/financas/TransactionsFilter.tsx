import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, TrendingUp, TrendingDown, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/useAppStore';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';

type TabType = 'all' | 'income' | 'expense';

export function TransactionsFilter() {
  const { incomes, expenses, categories } = useAppStore();
  const [tab, setTab] = useState<TabType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Sem categoria';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return '#6b7280';
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const filteredData = useMemo(() => {
    let data: Array<{
      id: string;
      type: 'income' | 'expense';
      description: string;
      amount: number;
      date: string;
      category_id?: string;
    }> = [];

    if (tab === 'all' || tab === 'income') {
      data = data.concat(
        incomes.map((i) => ({
          id: i.id,
          type: 'income' as const,
          description: i.source,
          amount: Number(i.amount),
          date: i.date,
          category_id: i.category_id,
        }))
      );
    }

    if (tab === 'all' || tab === 'expense') {
      data = data.concat(
        expenses.map((e) => ({
          id: e.id,
          type: 'expense' as const,
          description: e.description,
          amount: Number(e.amount),
          date: e.date,
          category_id: e.category_id,
        }))
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      data = data.filter((d) => d.category_id === categoryFilter);
    }

    // Filter by date range
    if (startDate) {
      data = data.filter((d) => {
        const itemDate = parseISO(d.date);
        return isAfter(itemDate, startOfDay(startDate)) || itemDate.getTime() === startOfDay(startDate).getTime();
      });
    }

    if (endDate) {
      data = data.filter((d) => {
        const itemDate = parseISO(d.date);
        return isBefore(itemDate, endOfDay(endDate)) || itemDate.getTime() === endOfDay(endDate).getTime();
      });
    }

    // Sort by date descending
    data.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

    return data;
  }, [incomes, expenses, tab, categoryFilter, startDate, endDate]);

  const totals = useMemo(() => {
    const totalIncome = filteredData
      .filter((d) => d.type === 'income')
      .reduce((acc, d) => acc + d.amount, 0);
    const totalExpense = filteredData
      .filter((d) => d.type === 'expense')
      .reduce((acc, d) => acc + d.amount, 0);
    return { income: totalIncome, expense: totalExpense, balance: totalIncome - totalExpense };
  }, [filteredData]);

  const allCategories = categories.filter((c) => 
    tab === 'all' || 
    (tab === 'income' && c.type === 'income') || 
    (tab === 'expense' && c.type === 'expense')
  );

  const clearFilters = () => {
    setCategoryFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="w-5 h-5 text-primary" />
          Filtro de Transações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="income">Entradas</TabsTrigger>
            <TabsTrigger value="expense">Saídas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-40 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'dd/MM/yyyy') : 'De'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-40 justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'dd/MM/yyyy') : 'Até'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" onClick={clearFilters}>
            Limpar
          </Button>
        </div>

        {/* Transactions List */}
        <ScrollArea className="h-[300px]">
          {filteredData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma transação encontrada
            </p>
          ) : (
            <div className="space-y-2">
              {filteredData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  {item.type === 'income' ? (
                    <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(item.category_id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(item.date), "dd 'de' MMM", { locale: ptBR })} • {getCategoryName(item.category_id)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      item.type === 'income' ? 'text-success' : 'text-destructive'
                    )}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Entradas</p>
            <p className="text-sm font-bold text-success">{formatCurrency(totals.income)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Saídas</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(totals.expense)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={cn('text-sm font-bold', totals.balance >= 0 ? 'text-success' : 'text-destructive')}>
              {formatCurrency(totals.balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
