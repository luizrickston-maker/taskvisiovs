import { useState, useMemo } from 'react';
import { History, Check, Clock, Calendar as CalendarIcon, MoveRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const defaultTypes: Record<string, { label: string; color: string }> = {
  cash: { label: 'Caixa', color: '#22c55e' },
  client: { label: 'Cliente', color: '#3b82f6' },
  project: { label: 'Projeto', color: '#8b5cf6' },
};

type StatusFilter = 'all' | 'pending' | 'completed';

export default function ActivityHistory() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [relocateOpen, setRelocateOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);

  const { timeBlocks, customTimeBlockTypes, updateTimeBlock } = useAppStore();

  const today = new Date();
  const tomorrow = addDays(today, 1);

  // Filter blocks - show all dates (including today/tomorrow for full visibility)
  const filteredBlocks = useMemo(() => {
    return timeBlocks
      .filter((block) => {
        const blockDate = parseISO(block.date);

        // Filter by selected date if one is selected
        if (selectedDate && !isSameDay(blockDate, selectedDate)) {
          return false;
        }

        // Filter by status
        if (statusFilter === 'pending' && block.completed) return false;
        if (statusFilter === 'completed' && !block.completed) return false;

        return true;
      })
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date); // Most recent first
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [timeBlocks, selectedDate, statusFilter]);

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
    if (custom) return { label: custom.name, color: custom.color || '#6366f1' };
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

  // Dates with activities (for calendar highlighting)
  const datesWithActivities = useMemo(() => {
    return timeBlocks.map(block => parseISO(block.date));
  }, [timeBlocks]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-primary" />
          Histórico de Atividades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar and Filter Row */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Calendar */}
          <div className="w-fit">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasActivity: datesWithActivities,
              }}
              modifiersStyles={{
                hasActivity: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                },
              }}
            />
          </div>

          {/* Filter */}
          <div className="flex flex-col gap-3 flex-1 min-w-[180px]">
            <div className="space-y-2">
              <Label className="text-sm">Filtrar por status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedDate && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {filteredBlocks.length} compromisso(s)
                </p>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedDate(undefined)}
              className="w-full"
            >
              Limpar seleção
            </Button>
          </div>
        </div>

        {/* Activities List */}
        <ScrollArea className="h-[250px]">
          {Object.keys(groupedBlocks).length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {selectedDate 
                ? 'Nenhuma atividade neste dia' 
                : 'Selecione uma data para ver as atividades'}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedBlocks).map(([date, blocks]) => {
                const dateObj = parseISO(date);

                return (
                  <div key={date}>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2 px-2 py-1 rounded bg-muted/30">
                      <CalendarIcon className="w-4 h-4" />
                      {format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </div>
                    <div className="space-y-2 pl-2">
                      {blocks.map((block) => {
                        const typeInfo = getTypeInfo(block.type);
                        return (
                          <div
                            key={block.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg border transition-all",
                              block.completed && "opacity-60"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={() => openRelocateDialog(block.id)}
                              title="Realocar"
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
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, 'dd/MM/yyyy') : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 z-50" 
                    align="center" 
                    side="bottom"
                    sideOffset={8}
                  >
                    <Calendar
                      mode="single"
                      selected={newDate}
                      onSelect={setNewDate}
                      initialFocus
                      locale={ptBR}
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