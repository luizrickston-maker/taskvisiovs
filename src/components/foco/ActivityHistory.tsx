import { useState, useMemo } from 'react';
import { History, Check, Clock, Calendar, ChevronLeft, ChevronRight, MoveRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, isBefore, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { TimeBlockType } from '@/types/database';

const defaultTypes: Record<string, { label: string; color: string }> = {
  cash: { label: 'Caixa', color: '#22c55e' },
  client: { label: 'Cliente', color: '#3b82f6' },
  project: { label: 'Projeto', color: '#8b5cf6' },
};

export default function ActivityHistory() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [relocateOpen, setRelocateOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);

  const { timeBlocks, customTimeBlockTypes, updateTimeBlock } = useAppStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const filteredBlocks = useMemo(() => {
    return timeBlocks
      .filter((block) => {
        const blockDate = parseISO(block.date);
        return isWithinInterval(blockDate, { start: monthStart, end: monthEnd });
      })
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [timeBlocks, monthStart, monthEnd]);

  // Group by date
  const groupedBlocks = useMemo(() => {
    const groups: Record<string, typeof timeBlocks> = {};
    filteredBlocks.forEach((block) => {
      if (!groups[block.date]) groups[block.date] = [];
      groups[block.date].push(block);
    });
    return groups;
  }, [filteredBlocks]);

  const getTypeInfo = (typeValue: string) => {
    if (defaultTypes[typeValue]) return defaultTypes[typeValue];
    const custom = customTimeBlockTypes.find((t) => t.id === typeValue);
    if (custom) return { label: custom.name, color: custom.color };
    return { label: typeValue, color: '#6b7280' };
  };

  const handleRelocate = async () => {
    if (!selectedBlockId || !newDate) return;

    const newDateStr = format(newDate, 'yyyy-MM-dd');

    const { error } = await supabase
      .from('time_blocks')
      .update({ date: newDateStr })
      .eq('id', selectedBlockId);

    if (error) {
      toast.error('Erro ao realocar compromisso');
      return;
    }

    updateTimeBlock(selectedBlockId, { date: newDateStr });
    setRelocateOpen(false);
    setSelectedBlockId(null);
    setNewDate(undefined);
    toast.success('Compromisso realocado!');
  };

  const openRelocateDialog = (blockId: string) => {
    setSelectedBlockId(blockId);
    setRelocateOpen(true);
  };

  const today = startOfDay(new Date());

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-primary" />
          Histórico de Atividades
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {Object.keys(groupedBlocks).length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhuma atividade neste mês
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedBlocks).map(([date, blocks]) => {
                const dateObj = parseISO(date);
                const isPast = isBefore(dateObj, today);
                const isToday = date === format(today, 'yyyy-MM-dd');
                const isFuture = isAfter(dateObj, today);

                return (
                  <div key={date}>
                    <div className={cn(
                      "flex items-center gap-2 text-sm font-medium mb-2 px-2 py-1 rounded",
                      isToday && "bg-primary/20 text-primary",
                      isPast && "text-muted-foreground",
                      isFuture && "text-foreground"
                    )}>
                      <Calendar className="w-4 h-4" />
                      {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      {isToday && <span className="text-xs">(Hoje)</span>}
                    </div>
                    <div className="space-y-2 pl-6">
                      {blocks.map((block) => {
                        const typeInfo = getTypeInfo(block.type);
                        return (
                          <div
                            key={block.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg border transition-all",
                              block.completed && "opacity-50"
                            )}
                            style={{
                              backgroundColor: `${block.color || typeInfo.color}15`,
                              borderColor: `${block.color || typeInfo.color}30`,
                            }}
                          >
                            {block.completed ? (
                              <Check className="w-4 h-4 text-success flex-shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: block.color || typeInfo.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm truncate",
                                block.completed && "line-through text-muted-foreground"
                              )}>
                                {block.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {block.start_time} - {block.end_time} • {typeInfo.label}
                              </p>
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              block.completed 
                                ? "bg-success/20 text-success" 
                                : "bg-amber-500/20 text-amber-500"
                            )}>
                              {block.completed ? 'Concluído' : 'Pendente'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => openRelocateDialog(block.id)}
                            >
                              <MoveRight className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Relocate Dialog */}
        <Dialog open={relocateOpen} onOpenChange={setRelocateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Realocar Compromisso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nova Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <Calendar className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, 'dd/MM/yyyy') : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                onClick={handleRelocate} 
                className="w-full"
                disabled={!newDate}
              >
                Realocar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
