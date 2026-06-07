import {
  addMonths,
  addWeeks,
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock3, MapPin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import { getCalendarEvents, getVisits } from "@/lib/data";
import type { VisitStatus } from "@/lib/types";
import { dateKey, formatDayMonth, formatTime } from "@/lib/utils";

export const metadata = { title: "Visitas" };

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    view?: string;
    month?: string;
    date?: string;
  }>;
}) {
  const query = await searchParams;
  const [visits, events] = await Promise.all([getVisits(), getCalendarEvents()]);
  const search = query.q?.trim().toLowerCase() ?? "";
  const filteredVisits = visits.filter(
    (visit) =>
      (!search ||
        visit.title.toLowerCase().includes(search) ||
        visit.clients?.name.toLowerCase().includes(search) ||
        visit.clients?.phone?.includes(search) ||
        visit.address_snapshot?.toLowerCase().includes(search)) &&
      (!query.status || visit.status === query.status),
  );
  const filteredEvents = events.filter(
    (event) =>
      (!query.type || query.type === "TODOS" || event.event_type === query.type) &&
      (!query.status || event.status === query.status),
  );
  const monthDate = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "")
    ? new Date(`${query.date}T12:00:00`)
    : /^\d{4}-\d{2}$/.test(query.month ?? "")
      ? new Date(`${query.month}-01T12:00:00`)
      : new Date();
  const view = ["month", "week", "today"].includes(query.view ?? "")
    ? query.view!
    : "month";
  const gridStart =
    view === "today"
      ? monthDate
      : view === "week"
        ? startOfWeek(monthDate, { weekStartsOn: 0 })
        : startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  const gridEnd =
    view === "today"
      ? monthDate
      : view === "week"
        ? endOfWeek(monthDate, { weekStartsOn: 0 })
        : endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 });
  const days = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) days.push(day);
  const previousDate =
    view === "month"
      ? addMonths(monthDate, -1)
      : view === "week"
        ? addWeeks(monthDate, -1)
        : addDays(monthDate, -1);
  const nextDate =
    view === "month"
      ? addMonths(monthDate, 1)
      : view === "week"
        ? addWeeks(monthDate, 1)
        : addDays(monthDate, 1);
  const calendarTitle =
    view === "month"
      ? format(monthDate, "MMMM 'de' yyyy", { locale: ptBR })
      : view === "week"
        ? `${format(gridStart, "dd MMM", { locale: ptBR })} a ${format(gridEnd, "dd MMM yyyy", { locale: ptBR })}`
        : format(monthDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const weekdayDays = view === "month" ? days.slice(0, 7) : days;

  return (
    <>
      <PageHeader
        eyebrow="Agenda comercial"
        title="Visitas"
        description="Organize levantamentos, retornos e próximos passos antes de gerar o orçamento."
        action={
          <Link className="button button-primary" href="/visits/new">
            <Plus size={17} />
            Nova visita
          </Link>
        }
      />

      <section className="quick-actions">
        <Link className="quick-action-card" href="/visits/new?quick=1">
          <CalendarDays size={24} />
          <span>
            <strong>Cadastro relâmpago</strong>
            <small>Cliente, telefone, local e horário.</small>
          </span>
        </Link>
        <Link className="quick-action-card" href="/clients#novo-cliente">
          <Plus size={24} />
          <span>
            <strong>Novo cliente</strong>
            <small>Complete o cadastro quando houver tempo.</small>
          </span>
        </Link>
        <Link className="quick-action-card" href="/services/new">
          <CircleDollarSignIcon />
          <span>
            <strong>Gerar orçamento</strong>
            <small>Comece direto pelo fluxo comercial.</small>
          </span>
        </Link>
      </section>

      <form className="card visit-filters">
        <div className="card-body form-grid form-grid-3">
          <label className="field">
            <span>
              <Search size={14} /> Buscar
            </span>
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Cliente, telefone ou endereço"
            />
          </label>
          <label className="field">
            Status
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">Todos</option>
              <option value="AGENDADA">Agendada</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CONVERTIDA_ORCAMENTO">Convertida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </label>
          <label className="field">
            Tipo na agenda
            <select name="type" defaultValue={query.type ?? "TODOS"}>
              <option value="TODOS">Visitas e serviços</option>
              <option value="VISITA">Somente visitas</option>
              <option value="SERVICO">Somente serviços</option>
            </select>
          </label>
          <input type="hidden" name="month" value={format(monthDate, "yyyy-MM")} />
          <input type="hidden" name="date" value={format(monthDate, "yyyy-MM-dd")} />
          <button className="button button-secondary" type="submit">
            Aplicar filtros
          </button>
        </div>
      </form>

      <section className="visits-layout">
        <article className="card calendar-card">
          <div className="card-header calendar-heading">
            <div>
              <h2>{calendarTitle}</h2>
              <p>Visitas e execuções previstas em uma única agenda.</p>
            </div>
            <div className="calendar-toolbar">
              <div className="calendar-view-tabs">
                <Link className={view === "month" ? "active" : ""} href={`/visits?view=month&date=${format(monthDate, "yyyy-MM-dd")}`}>Mês</Link>
                <Link className={view === "week" ? "active" : ""} href={`/visits?view=week&date=${format(monthDate, "yyyy-MM-dd")}`}>Semana</Link>
                <Link className={view === "today" ? "active" : ""} href="/visits?view=today">Hoje</Link>
              </div>
              <div className="calendar-nav">
              <Link
                className="button button-secondary button-small"
                href={`/visits?view=${view}&date=${format(previousDate, "yyyy-MM-dd")}`}
              >
                Anterior
              </Link>
              <Link
                className="button button-secondary button-small"
                href={`/visits?view=${view}&date=${format(nextDate, "yyyy-MM-dd")}`}
              >
                Próximo
              </Link>
              </div>
            </div>
          </div>
          <div className={`calendar-weekdays calendar-columns-${days.length}`}>
            {weekdayDays.map((day) => (
              <span key={day.toISOString()}>
                {format(day, view === "today" ? "EEEE" : "EEE", { locale: ptBR })}
              </span>
            ))}
          </div>
          <div className={`calendar-grid calendar-columns-${days.length}`}>
            {days.map((day) => {
              const dayEvents = filteredEvents.filter((event) =>
                dateKey(event.starts_at) === format(day, "yyyy-MM-dd"),
              );
              return (
                <div
                  className={[
                    "calendar-day",
                    !isSameMonth(day, monthDate) ? "calendar-day-muted" : "",
                    dateKey(day) === dateKey(new Date()) ? "calendar-day-today" : "",
                  ].join(" ")}
                  key={day.toISOString()}
                >
                  <span className="calendar-day-number">{format(day, "d")}</span>
                  <div className="calendar-events">
                    {dayEvents.slice(0, view === "month" ? 3 : 12).map((event) => (
                      <Link
                        className={`calendar-event calendar-event-${event.event_type.toLowerCase()}`}
                        href={event.href}
                        key={`${event.event_type}-${event.id}`}
                      >
                        <time>{formatTime(event.starts_at)}</time>
                        {event.title}
                      </Link>
                    ))}
                    {dayEvents.length > (view === "month" ? 3 : 12) ? (
                      <small>+{dayEvents.length - (view === "month" ? 3 : 12)} eventos</small>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <aside className="card upcoming-visits">
          <div className="card-header">
            <div>
              <h2>Próximas visitas</h2>
              <p>{filteredVisits.length} registros encontrados.</p>
            </div>
          </div>
          <div className="card-body visit-list">
            {filteredVisits.slice(0, 12).map((visit) => (
              <Link className="visit-list-item" href={`/visits/${visit.id}`} key={visit.id}>
                <div className="visit-list-date">
                  <strong>{formatDayMonth(visit.scheduled_start_at).day}</strong>
                  <span>{formatDayMonth(visit.scheduled_start_at).month}</span>
                </div>
                <div>
                  <VisitStatusBadge status={visit.status as VisitStatus} />
                  <strong>{visit.title}</strong>
                  <span>{visit.clients?.name}</span>
                  <small>
                    <Clock3 size={12} />
                    {formatTime(visit.scheduled_start_at)}
                    <MapPin size={12} />
                    {visit.address_snapshot || "Local a confirmar"}
                  </small>
                </div>
              </Link>
            ))}
            {!filteredVisits.length ? (
              <p className="muted-copy">Nenhuma visita encontrada.</p>
            ) : null}
          </div>
        </aside>
      </section>
    </>
  );
}

function CircleDollarSignIcon() {
  return <span className="quick-action-symbol">R$</span>;
}
