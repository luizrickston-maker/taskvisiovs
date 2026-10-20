import { useMemo, useState } from 'react';
import {
  CalendarClock, Clock, CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, Plus, Ban, CalendarOff,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AgendaPJ } from '@/components/agenda/AgendaPJ';
import { CollaboratorSelector } from '@/components/agenda/CollaboratorSelector';
import { AppointmentNotifier } from '@/components/agenda/AppointmentNotifier';
import { AgendaDayView, AgendaMonthView } from '@/components/agenda/views';
import {
  availabilityConflictsWith,
  mapAppointmentToCalendarEvent,
  mapAvailabilityToCalendarEvents,
} from '@/components/agenda/CalendarEvent';
import type { CollaboratorAppointmentRow } from '@/components/agenda/CalendarEvent';
import { useTimeBlocks } from '@/hooks/useAgendaPJ';
import { useCollaboratorAvailability } from '@/hooks/useCollaboratorAvailability';
import {
  useCancelAppointment,
  useCollaboratorAppointments,
  useCreateAppointment,
} from '@/hooks/useCollaboratorAppointments';
import { formatDateBR, hasConflict, timeToMinutes } from '@/lib/schedule';
import { useAppStore } from '@/stores/useAppStore';

// =====================================================
// Manager's /pj/agenda. With no collaborator selected this is the personal
// agenda exactly as it has always been (MGR-02); selecting one swaps the
// whole source to that collaborator's appointments and unavailability
// (MGR-03) and clears the personal events from view (MGR-11).
// =====================================================

function useAgendaStats() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: todayBlocks = [] } = useTimeBlocks(today, today);
  const { data: weekBlocks = [] } = useTimeBlocks(weekStart, weekEnd);

  return useMemo(() => {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = todayBlocks.filter(b => b.start_time > nowStr);
    const conflicts = weekBlocks.filter(b =>
      weekBlocks.some(o => o.id !== b.id && hasConflict(b, o))
    );
    return {
      todayTotal: todayBlocks.length,
      upcoming: upcoming.length,
      weekTotal: weekBlocks.length,
      conflicts: conflicts.length,
    };
  }, [todayBlocks, weekBlocks]);
}

const STATUS_LABELS: Record<'pending' | 'confirmed' | 'cancelled', string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

const STATUS_CLASSES: Record<'pending' | 'confirmed' | 'cancelled', string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/30',
};

// ─────────────────────────────────────────────
// The selected collaborator's calendar
// ─────────────────────────────────────────────

interface AppointmentForm {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

function CollaboratorAgenda({ memberUserId }: { memberUserId: string }) {
  // The store row stays the source of the display name and of the active
  // flag the save path re-reads (Edge Case: deactivated between select and save).
  const member = useAppStore(state =>
    state.corporateTeam.find(row => row.member_user_id === memberUserId) ?? null,
  );

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CollaboratorAppointmentRow | null>(null);
  const [form, setForm] = useState<AppointmentForm>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '10:00',
    notes: '',
  });

  const dateFrom = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

  const availability = useCollaboratorAvailability(dateFrom, dateTo, memberUserId);
  const appointments = useCollaboratorAppointments(dateFrom, dateTo, memberUserId);
  const create = useCreateAppointment();
  const cancel = useCancelAppointment();

  const availabilityRows = availability.data ?? [];
  const appointmentRows = appointments.data ?? [];

  const events = useMemo(
    () => [
      ...availabilityRows.flatMap(mapAvailabilityToCalendarEvents),
      ...appointmentRows.map(a =>
        mapAppointmentToCalendarEvent(a, {
          conflicted: availabilityConflictsWith(a, availabilityRows),
        }),
      ),
    ],
    [availabilityRows, appointmentRows],
  );

  function openCreate() {
    setFormError(null);
    setForm({
      title: '',
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      notes: '',
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) return;
    if (timeToMinutes(form.end_time) <= timeToMinutes(form.start_time)) {
      setFormError('Horário fim deve ser após o início');
      return;
    }
    if (!member || !member.is_active) {
      setFormError('Este colaborador não está mais ativo.');
      return;
    }

    try {
      // NOTIF-01 starts here: one created appointment, one notification.
      const createdRow = await create.mutateAsync({
        member_user_id: memberUserId,
        collaboratorName: member.name,
        title: form.title.trim(),
        notes: form.notes.trim() ? form.notes.trim() : null,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      setCreated(createdRow);
      setFormOpen(false);
    } catch (err) {
      // MGR-04: the refusal is shown here and nothing reached the database.
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelAppointment(id: string) {
    try {
      await cancel.mutateAsync({ id });
    } catch {
      // The mutation already reported the refusal.
    }
  }

  return (
    <>
      {/* Period navigation + the way in */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-3 border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setSelectedDate(d => subMonths(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold capitalize min-w-[9rem] text-center">
            {format(selectedDate, "MMMM 'de' yyyy")}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setSelectedDate(d => addMonths(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{member?.name}</span>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Novo compromisso
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <section className="space-y-4">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-3 md:p-5">
            <AgendaMonthView
              selectedDate={selectedDate}
              events={events}
              mode="read"
              onDaySelect={setSelectedDate}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-3 md:p-5 space-y-3">
            <p className="text-sm font-semibold capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <AgendaDayView date={selectedDate} events={events} mode="read" />
          </CardContent>
        </Card>
      </section>

      {/* Appointments */}
      <section className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" /> Compromissos
        </h2>

        {appointmentRows.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-10 rounded-2xl text-center border border-dashed border-border font-medium">
            Nenhum compromisso agendado. Use “Novo compromisso” para agendar.
          </p>
        ) : (
          <div className="space-y-3">
            {appointmentRows.map(apt => (
              <Card key={apt.id} className="bg-card border border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-semibold text-sm">{apt.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDateBR(apt.date)} · {apt.start_time}–{apt.end_time}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_CLASSES[apt.status]}>
                      {STATUS_LABELS[apt.status]}
                    </Badge>
                  </div>

                  {apt.notes && apt.notes.trim() && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border-l-2 border-border pl-3">
                      {apt.notes}
                    </p>
                  )}

                  {/* MGR-09 + AD-007: the manager withdraws scheduling from
                      pending or confirmed; a cancelled row is terminal. */}
                  {apt.status !== 'cancelled' && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => { void cancelAppointment(apt.id); }}
                        disabled={cancel.isPending}
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Declared unavailability */}
      <section className="space-y-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-primary" /> Indisponibilidades
        </h2>

        {availabilityRows.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-muted/30 p-8 rounded-2xl text-center border border-dashed border-border font-medium">
            Sem indisponibilidade declarada neste mês.
          </p>
        ) : (
          <div className="space-y-2">
            {availabilityRows.map(row => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    {row.reason && row.reason.trim() ? row.reason : 'Indisponível'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateBR(row.start_date)}
                    {row.start_date !== row.end_date && ` – ${formatDateBR(row.end_date)}`}
                    {row.start_time && ` · ${row.start_time}–${row.end_time}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NOTIF-02 / NOTIF-08: how the notification for this appointment went. */}
      {created && <AppointmentNotifier appointment={created} />}

      {/* Create */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm mx-4 md:mx-auto">
          <DialogHeader>
            <DialogTitle>Novo compromisso</DialogTitle>
            <DialogDescription>
              Agende um compromisso na agenda de {member?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm min-w-0 text-amber-600 dark:text-amber-400">{formError}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="apt-title">Título *</Label>
              <Input
                id="apt-title"
                value={form.title}
                required
                autoFocus
                placeholder="Ex: Reunião com cliente"
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apt-date">Data</Label>
              <Input
                id="apt-date"
                type="date"
                value={form.date}
                required
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="apt-start">Início</Label>
                <Input
                  id="apt-start"
                  type="time"
                  value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apt-end">Fim</Label>
                <Input
                  id="apt-end"
                  type="time"
                  value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apt-notes">Observação</Label>
              <Textarea
                id="apt-notes"
                value={form.notes}
                placeholder="Opcional"
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={create.isPending}>
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function AgendaPage() {
  const stats = useAgendaStats();
  const weekdayLabel = format(new Date(), "EEEE", { locale: ptBR });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarClock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {weekdayLabel} · Gestão de compromissos e blocos de tempo
            </p>
          </div>
        </div>

        {/* MGR-01 */}
        <CollaboratorSelector value={selectedMemberId} onChange={setSelectedMemberId} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarClock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayTotal}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Próximos hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CalendarDays className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.weekTotal}</p>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`glass-card ${stats.conflicts > 0 ? 'border-amber-400/40' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.conflicts > 0 ? 'bg-amber-500/10' : 'bg-muted'}`}>
                <AlertTriangle className={`w-4 h-4 ${stats.conflicts > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.conflicts}</p>
                <p className="text-xs text-muted-foreground">Conflitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MGR-02 / MGR-03 / MGR-11: the source follows the selector. */}
      {selectedMemberId === null ? (
        <AgendaPJ />
      ) : (
        <CollaboratorAgenda key={selectedMemberId} memberUserId={selectedMemberId} />
      )}
    </div>
  );
}
