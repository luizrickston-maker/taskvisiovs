import { useState, useMemo } from 'react';
import {
  format, addDays, subDays, startOfWeek, endOfWeek,
  eachDayOfInterval, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useTimeBlocks, useCreateTimeBlock, useUpdateTimeBlock, useDeleteTimeBlock,
} from '@/hooks/useAgendaPJ';
import { hasConflict, timeToMinutes } from '@/lib/schedule';
import {
  AgendaDayView, AgendaWeekView, AgendaMonthView,
  APPOINTMENT_TYPES, END_HOUR, START_HOUR, getTypeConf, type AgendaViewEvent,
} from '@/components/agenda/views';
import type { TimeBlock } from '@/types/database';

// =====================================================
// Personal agenda. The month/day/week views and the popover live in
// src/components/agenda/views/ as presentational components driven by an
// `events` prop; this component only owns the data, the form and the dialogs.
// =====================================================

const TIME_OPTIONS: string[] = [];
for (let m = START_HOUR * 60; m <= END_HOUR * 60; m += 30) {
  TIME_OPTIONS.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}

function addMinutes(time: string, min: number): string {
  const total = Math.min(timeToMinutes(time) + min, END_HOUR * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** `time_blocks` row -> the presentation shape the views render. */
function toViewEvent(block: TimeBlock): AgendaViewEvent {
  return {
    id: block.id,
    date: block.date,
    start: block.start_time,
    end: block.end_time,
    title: block.title,
    color: block.color ?? getTypeConf(block.type).color,
    type: block.type,
    kind: 'personal',
  };
}

interface FormState {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  color: string;
}

type ViewType = 'day' | 'week' | 'month';

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function AgendaPJ() {
  const [view, setView] = useState<ViewType>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimeBlock | null>(null);
  // delete confirmation lives at the top level — avoids Popover/AlertDialog conflict
  const [deletingBlock, setDeletingBlock] = useState<TimeBlock | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '', date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00', end_time: '10:00',
    type: 'reuniao', color: '#3b82f6',
  });

  const weekStart  = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd    = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(selectedDate);
  const monthEnd   = endOfMonth(selectedDate);

  const dateFrom = view === 'day'  ? format(selectedDate, 'yyyy-MM-dd')
                 : view === 'week' ? format(weekStart,    'yyyy-MM-dd')
                 :                   format(monthStart,   'yyyy-MM-dd');
  const dateTo   = view === 'day'  ? format(selectedDate, 'yyyy-MM-dd')
                 : view === 'week' ? format(weekEnd,      'yyyy-MM-dd')
                 :                   format(monthEnd,     'yyyy-MM-dd');

  const { data: blocks = [] } = useTimeBlocks(dateFrom, dateTo);
  const createMut = useCreateTimeBlock();
  const updateMut = useUpdateTimeBlock();
  const deleteMut = useDeleteTimeBlock();

  const events = useMemo(() => blocks.map(toViewEvent), [blocks]);

  const formConflicts = useMemo(() => {
    if (!form.start_time || !form.end_time) return [];
    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) return [];
    return blocks.filter(b =>
      b.date === form.date &&
      b.id !== editing?.id &&
      hasConflict({ ...form, id: editing?.id }, b)
    );
  }, [form, blocks, editing]);

  function goToToday() {
    setSelectedDate(new Date());
    setView('day');
  }

  function openAdd(date?: Date, startTime?: string) {
    setEditing(null);
    const d = date ?? selectedDate;
    const start = startTime ?? '09:00';
    setForm({
      title: '', date: format(d, 'yyyy-MM-dd'),
      start_time: start, end_time: addMinutes(start, 60),
      type: 'reuniao', color: '#3b82f6',
    });
    setFormOpen(true);
  }

  function openEdit(block: TimeBlock) {
    setEditing(block);
    setForm({
      title: block.title, date: block.date,
      start_time: block.start_time, end_time: block.end_time,
      type: block.type, color: block.color ?? '#3b82f6',
    });
    setFormOpen(true);
  }

  // The views hand back presentation events; the dialogs still work on the
  // original row so nothing about the form's values changes.
  function openEditFromEvent(ev: AgendaViewEvent) {
    const block = blocks.find(b => b.id === ev.id);
    if (block) openEdit(block);
  }

  function requestDeleteFromEvent(ev: AgendaViewEvent) {
    const block = blocks.find(b => b.id === ev.id);
    if (block) setDeletingBlock(block);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      toast.error('Horário fim deve ser após o início');
      return;
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    setFormOpen(false);
  }

  async function confirmDelete() {
    if (!deletingBlock) return;
    deleteMut.mutate(deletingBlock.id);
    setDeletingBlock(null);
  }

  const goToPrev = () => {
    if (view === 'day')  setSelectedDate(d => subDays(d, 1));
    else if (view === 'week') setSelectedDate(d => subWeeks(d, 1));
    else                 setSelectedDate(d => subMonths(d, 1));
  };
  const goToNext = () => {
    if (view === 'day')  setSelectedDate(d => addDays(d, 1));
    else if (view === 'week') setSelectedDate(d => addWeeks(d, 1));
    else                 setSelectedDate(d => addMonths(d, 1));
  };

  const periodLabel = view === 'day'
    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
    : view === 'week'
    ? `${format(weekStart, "d MMM", { locale: ptBR })} – ${format(weekEnd, "d MMM", { locale: ptBR })}`
    : format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  const VIEW_LABELS: Record<ViewType, { full: string; short: string }> = {
    day:   { full: 'Dia',    short: 'Dia' },
    week:  { full: 'Semana', short: 'Sem' },
    month: { full: 'Mês',    short: 'Mês' },
  };

  return (
    <>
      <Card className="glass-card">
        <CardContent className="p-3 md:p-5 space-y-3 md:space-y-4">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
              <span className="font-semibold capitalize text-sm md:text-base truncate">{periodLabel}</span>
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 flex-wrap shrink-0">
              {/* View toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                {(['day', 'week', 'month'] as ViewType[]).map((v, i) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'px-2 md:px-3 py-1.5 font-medium transition-colors',
                      i > 0 && 'border-l border-border',
                      view === v ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    <span className="hidden sm:inline">{VIEW_LABELS[v].full}</span>
                    <span className="sm:hidden">{VIEW_LABELS[v].short}</span>
                  </button>
                ))}
              </div>

              <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" className="h-8 md:h-7 gap-1.5 text-xs px-3" onClick={() => openAdd()}>
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </div>
          </div>

          {/* ── Views ── */}
          {view === 'day' && (
            <AgendaDayView
              date={selectedDate}
              events={events}
              mode="edit"
              onAddAt={(t) => openAdd(selectedDate, t)}
              onEdit={openEditFromEvent}
              onRequestDelete={requestDeleteFromEvent}
            />
          )}
          {view === 'week' && (
            <AgendaWeekView
              days={eachDayOfInterval({ start: weekStart, end: weekEnd })}
              events={events}
              mode="edit"
              onDaySelect={(d) => { setSelectedDate(d); setView('day'); }}
              onAddAt={(d, t) => openAdd(d, t)}
              onEdit={openEditFromEvent}
              onRequestDelete={requestDeleteFromEvent}
            />
          )}
          {view === 'month' && (
            <AgendaMonthView
              selectedDate={selectedDate}
              events={events}
              mode="edit"
              onDaySelect={(d) => { setSelectedDate(d); setView('day'); }}
              onAddAt={(d) => openAdd(d)}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Appointment Form ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm mx-4 md:mx-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Compromisso' : 'Novo Compromisso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formConflicts.length > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm min-w-0">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Conflito de horário</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formConflicts.map(c => `"${c.title}" ${c.start_time}–${c.end_time}`).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="apt-title">Título *</Label>
              <Input
                id="apt-title" value={form.title} required autoFocus
                placeholder="Ex: Reunião com cliente"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Input
                  type="date" value={form.date} required
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => {
                  const tc = getTypeConf(v);
                  setForm(f => ({ ...f, type: v, color: tc.color }));
                }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Select value={form.start_time} onValueChange={v => setForm(f => ({ ...f, start_time: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Select value={form.end_time} onValueChange={v => setForm(f => ({ ...f, end_time: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation — rendered OUTSIDE Card/Popover hierarchy ── */}
      <AlertDialog open={!!deletingBlock} onOpenChange={(open) => { if (!open) setDeletingBlock(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover compromisso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O compromisso "{deletingBlock?.title}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
