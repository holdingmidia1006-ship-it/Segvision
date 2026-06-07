import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarPlus,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { addClientNote } from "@/lib/actions";
import {
  getClient,
  getClientHistory,
  getServices,
  getVisits,
  isDemoMode,
} from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, history, allVisits, allServices] = await Promise.all([
    getClient(id),
    getClientHistory(id),
    getVisits(),
    getServices(),
  ]);
  if (!client) notFound();
  const demo = isDemoMode();
  const visits = allVisits.filter((visit) => visit.client_id === id);
  const services = allServices.filter((service) => service.client_id === id);
  const revenue = services
    .filter((service) => service.status !== "CANCELADO")
    .reduce((sum, service) => sum + Number(service.sale_amount), 0);
  const address = client.client_addresses?.find((item) => item.is_primary);
  const whatsapp = client.phone?.replace(/\D/g, "");

  return (
    <>
      <Link className="button button-secondary button-small" href="/clients">
        <ArrowLeft size={14} />
        Voltar aos clientes
      </Link>

      <section className="service-hero client-hero">
        <div>
          <span className="eyebrow">
            {client.record_type === "LEAD" ? "Lead" : "Cliente"}
          </span>
          <h1>{client.name}</h1>
          <p>{client.document || "Documento ainda não informado"}</p>
        </div>
        <div className="visit-primary-actions">
          {whatsapp ? (
            <a className="button button-secondary" href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noreferrer">
              <MessageCircle size={16} /> WhatsApp
            </a>
          ) : null}
          {client.phone ? (
            <a className="button button-secondary" href={`tel:${client.phone}`}>
              <Phone size={16} /> Ligar
            </a>
          ) : null}
        </div>
      </section>

      <section className="quick-actions">
        <Link className="quick-action-card" href={`/visits/new?client=${client.id}`}>
          <CalendarPlus size={24} />
          <span><strong>Nova visita</strong><small>Agendar um atendimento.</small></span>
        </Link>
        <Link className="quick-action-card" href={`/services/new?client=${client.id}`}>
          <BriefcaseBusiness size={24} />
          <span><strong>Novo orçamento</strong><small>Iniciar proposta para este cliente.</small></span>
        </Link>
        <a className="quick-action-card" href="#nova-observacao">
          <Plus size={24} />
          <span><strong>Observação</strong><small>Registrar contexto comercial ou técnico.</small></span>
        </a>
      </section>

      <section className="stats-grid client-stats">
        <div className="stat-card"><div className="stat-content"><span>Visitas</span><strong>{visits.length}</strong><small>{visits.filter((v) => v.status === "AGENDADA" || v.status === "CONFIRMADA").length} próximas</small></div></div>
        <div className="stat-card"><div className="stat-content"><span>Orçamentos e serviços</span><strong>{services.length}</strong><small>{services.filter((s) => s.status === "ORCAMENTO").length} em orçamento</small></div></div>
        <div className="stat-card"><div className="stat-content"><span>Valor acumulado</span><strong>{formatCurrency(revenue)}</strong><small>Registros não cancelados</small></div></div>
        <div className="stat-card"><div className="stat-content"><span>Última movimentação</span><strong>{history[0] ? formatDate(history[0].event_date) : "—"}</strong><small>{history[0]?.event_label || "Sem histórico"}</small></div></div>
      </section>

      <section className="detail-grid client-detail-grid">
        <div className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div><h2>Histórico completo</h2><p>Todos os acontecimentos em ordem cronológica.</p></div>
            </div>
            <div className="card-body timeline">
              {history.map((event) => (
                <div className="timeline-item" key={`${event.source_table}-${event.source_id}`}>
                  <span className={`timeline-dot timeline-${event.color_token}`} />
                  <div>
                    <time>{formatDate(event.event_date)}</time>
                    <strong>{event.event_label}: {event.headline}</strong>
                    {event.description ? <p>{event.description}</p> : null}
                    {event.source_table === "visits" ? <Link href={`/visits/${event.source_id}`}>Abrir visita</Link> : null}
                    {event.source_table === "services" ? <Link href={`/services/${event.source_id}`}>Abrir serviço</Link> : null}
                  </div>
                </div>
              ))}
              {!history.length ? <p className="muted-copy">Nenhuma movimentação registrada.</p> : null}
            </div>
          </article>
        </div>

        <aside className="detail-stack">
          <article className="card">
            <div className="card-header"><div><h2>Contato e endereço</h2><p>Informações principais do cadastro.</p></div></div>
            <div className="card-body entity-meta client-contact-list">
              <span><Phone size={15} /> {client.phone || "Telefone não informado"}</span>
              <span><Mail size={15} /> {client.email || "E-mail não informado"}</span>
              <span><MapPin size={15} /> {address ? `${address.street}, ${address.number || "s/n"} - ${address.city}/${address.state}` : "Endereço não informado"}</span>
            </div>
          </article>

          <article className="card" id="nova-observacao">
            <div className="card-header"><div><h2>Nova observação</h2><p>Registre um contexto para a equipe.</p></div></div>
            <form className="card-body" action={addClientNote}>
              <input type="hidden" name="client_id" value={client.id} />
              <label className="field">
                Tipo
                <select name="note_type" defaultValue="MANUAL" disabled={demo}>
                  <option value="MANUAL">Geral</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="TECNICA">Técnica</option>
                </select>
              </label>
              <label className="field">
                Observação
                <textarea name="content" required disabled={demo} />
              </label>
              <SubmitButton className="button-full" disabled={demo}>Salvar observação</SubmitButton>
            </form>
          </article>
        </aside>
      </section>
    </>
  );
}
