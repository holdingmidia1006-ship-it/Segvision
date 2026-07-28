import {
  BriefcaseBusiness,
  CalendarPlus,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ConfirmSubmitButton } from "@/components/ui/confirm-dialog";
import { MaskedInput } from "@/components/ui/masked-input";
import { Toast } from "@/components/ui/toast";
import {
  addClientAddress,
  addClientNote,
  deleteClientAddress,
  updateClient,
  updateClientAddress,
} from "@/lib/actions";
import {
  getClient,
  getClientHistory,
  getCurrentProfile,
  getServices,
  getVisits,
  isDemoMode,
} from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

type ClientDetailQuery = {
  address?: string;
  note?: string;
  saved?: string;
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ClientDetailQuery>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const demo = isDemoMode();
  const [client, history, allVisits, allServices, profile] = await Promise.all([
    getClient(id),
    getClientHistory(id),
    getVisits(),
    getServices(),
    demo ? Promise.resolve(null) : getCurrentProfile(),
  ]);
  if (!client) notFound();
  const isAdmin = demo || profile?.role === "ADMIN";
  const visits = allVisits.filter((visit) => visit.client_id === id);
  const services = allServices.filter((service) => service.client_id === id);
  const revenue = services
    .filter((service) => service.status !== "CANCELADO")
    .reduce((sum, service) => sum + Number(service.sale_amount), 0);
  const addresses = [...(client.client_addresses ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary),
  );
  const primaryAddress = addresses[0];
  const whatsapp = client.phone?.replace(/\D/g, "");

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/clients", label: "Clientes" },
          { label: client.name },
        ]}
      />
      {query.saved ? <Toast>Dados do cliente atualizados.</Toast> : null}
      {query.address ? <Toast>Endereço atualizado.</Toast> : null}
      {query.note ? <Toast>Observação registrada.</Toast> : null}

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
            <a
              className="button button-secondary"
              href={`https://wa.me/55${whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle aria-hidden="true" size={16} /> WhatsApp
            </a>
          ) : null}
          {client.phone ? (
            <a className="button button-secondary" href={`tel:${client.phone}`}>
              <Phone aria-hidden="true" size={16} /> Ligar
            </a>
          ) : null}
        </div>
      </section>

      <section className="quick-actions" aria-label="Ações do cliente">
        <Link className="quick-action-card" href={`/visits/new?client=${client.id}`}>
          <CalendarPlus aria-hidden="true" size={24} />
          <span>
            <strong>Nova visita</strong>
            <small>Agendar um atendimento.</small>
          </span>
        </Link>
        <Link className="quick-action-card" href={`/services/new?client=${client.id}`}>
          <BriefcaseBusiness aria-hidden="true" size={24} />
          <span>
            <strong>Novo orçamento</strong>
            <small>Iniciar proposta para este cliente.</small>
          </span>
        </Link>
        <a className="quick-action-card" href="#nova-observacao">
          <Plus aria-hidden="true" size={24} />
          <span>
            <strong>Observação</strong>
            <small>Registrar contexto comercial ou técnico.</small>
          </span>
        </a>
      </section>

      <section className="stats-grid client-stats">
        <div className="stat-card">
          <div className="stat-content">
            <span>Visitas</span>
            <strong>{visits.length}</strong>
            <small>
              {
                visits.filter(
                  (visit) =>
                    visit.status === "AGENDADA" || visit.status === "CONFIRMADA",
                ).length
              }{" "}
              próximas
            </small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span>Orçamentos e serviços</span>
            <strong>{services.length}</strong>
            <small>
              {services.filter((service) => service.status === "ORCAMENTO").length}{" "}
              em orçamento
            </small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span>Valor acumulado</span>
            <strong>{formatCurrency(revenue)}</strong>
            <small>Registros não cancelados</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span>Última movimentação</span>
            <strong>{history[0] ? formatDate(history[0].event_date) : "—"}</strong>
            <small>{history[0]?.event_label || "Sem histórico"}</small>
          </div>
        </div>
      </section>

      <section className="detail-grid client-detail-grid">
        <div className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Histórico completo</h2>
                <p>Todos os acontecimentos em ordem cronológica.</p>
              </div>
            </div>
            <div className="card-body timeline">
              {history.map((event) => (
                <div
                  className="timeline-item"
                  key={`${event.source_table}-${event.source_id}`}
                >
                  <span className={`timeline-dot timeline-${event.color_token}`} />
                  <div>
                    <time>{formatDate(event.event_date)}</time>
                    <strong>
                      {event.event_label}: {event.headline}
                    </strong>
                    {event.description ? <p>{event.description}</p> : null}
                    {event.source_table === "visits" ? (
                      <Link href={`/visits/${event.source_id}`}>Abrir visita</Link>
                    ) : null}
                    {event.source_table === "services" ? (
                      <Link href={`/services/${event.source_id}`}>Abrir serviço</Link>
                    ) : null}
                  </div>
                </div>
              ))}
              {!history.length ? (
                <p className="muted-copy">Nenhuma movimentação registrada.</p>
              ) : null}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Endereços</h2>
                <p>Escolha o principal e mantenha todos os locais atendidos.</p>
              </div>
              <MapPin aria-hidden="true" size={19} />
            </div>
            <div className="card-body address-list">
              {addresses.map((address) => (
                <details className="record-disclosure" key={address.id}>
                  <summary>
                    <span>
                      <strong>{address.label}</strong>
                      <small>
                        {address.street}, {address.number || "s/n"} - {address.city}/
                        {address.state}
                      </small>
                    </span>
                    {address.is_primary ? (
                      <span className="ui-badge ui-badge-info">Principal</span>
                    ) : null}
                  </summary>
                  <form className="form-grid" action={updateClientAddress}>
                    <input type="hidden" name="id" value={address.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <label className="field">
                      Identificação
                      <input
                        name="label"
                        defaultValue={address.label}
                        required
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      Rua
                      <input
                        name="street"
                        defaultValue={address.street}
                        required
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      Número
                      <input
                        name="number"
                        defaultValue={address.number ?? ""}
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      Bairro
                      <input
                        name="district"
                        defaultValue={address.district ?? ""}
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      Cidade
                      <input
                        name="city"
                        defaultValue={address.city}
                        required
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      Estado
                      <input
                        name="state"
                        defaultValue={address.state}
                        maxLength={2}
                        required
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      CEP
                      <MaskedInput
                        name="postal_code"
                        mask="postal-code"
                        defaultValue={address.postal_code ?? ""}
                        disabled={demo}
                      />
                    </label>
                    <label className="field">
                      Complemento
                      <input
                        name="complement"
                        defaultValue={address.complement ?? ""}
                        disabled={demo}
                      />
                    </label>
                    <label className="checkbox-card field-full">
                      <input
                        name="is_primary"
                        type="checkbox"
                        defaultChecked={address.is_primary}
                        disabled={demo}
                      />
                      Endereço principal
                    </label>
                    <div className="record-actions field-full">
                      <SubmitButton disabled={demo}>Salvar endereço</SubmitButton>
                    </div>
                  </form>
                  {!demo && isAdmin ? (
                    <form className="record-danger" action={deleteClientAddress}>
                      <input type="hidden" name="id" value={address.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <ConfirmSubmitButton
                        title={`Excluir o endereço ${address.label}?`}
                        description="Visitas e orçamentos que apontam para este endereço manterão o registro, mas ficarão sem o vínculo do endereço cadastrado."
                        confirmLabel="Excluir endereço"
                      >
                        <Trash2 aria-hidden="true" size={14} /> Excluir endereço
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </details>
              ))}
              {!addresses.length ? (
                <p className="muted-copy">Nenhum endereço cadastrado.</p>
              ) : null}
              <details className="record-disclosure">
                <summary>
                  <span>
                    <strong>Adicionar endereço</strong>
                    <small>Novo local de instalação ou atendimento.</small>
                  </span>
                  <Plus aria-hidden="true" size={18} />
                </summary>
                <form className="form-grid" action={addClientAddress}>
                  <input type="hidden" name="client_id" value={client.id} />
                  <label className="field">
                    Identificação
                    <input name="label" defaultValue="Principal" required disabled={demo} />
                  </label>
                  <label className="field">
                    Rua
                    <input name="street" required disabled={demo} />
                  </label>
                  <label className="field">
                    Número
                    <input name="number" disabled={demo} />
                  </label>
                  <label className="field">
                    Bairro
                    <input name="district" disabled={demo} />
                  </label>
                  <label className="field">
                    Cidade
                    <input name="city" required disabled={demo} />
                  </label>
                  <label className="field">
                    Estado
                    <input
                      name="state"
                      defaultValue="GO"
                      maxLength={2}
                      required
                      disabled={demo}
                    />
                  </label>
                  <label className="field">
                    CEP
                    <MaskedInput
                      name="postal_code"
                      mask="postal-code"
                      disabled={demo}
                    />
                  </label>
                  <label className="field">
                    Complemento
                    <input name="complement" disabled={demo} />
                  </label>
                  <label className="checkbox-card field-full">
                    <input name="is_primary" type="checkbox" disabled={demo} />
                    Tornar endereço principal
                  </label>
                  <SubmitButton disabled={demo}>Adicionar endereço</SubmitButton>
                </form>
              </details>
            </div>
          </article>
        </div>

        <aside className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Contato principal</h2>
                <p>Informações usadas na visita e no orçamento.</p>
              </div>
            </div>
            <div className="card-body entity-meta client-contact-list">
              <span>
                <Phone aria-hidden="true" size={15} />{" "}
                {client.phone || "Telefone não informado"}
              </span>
              <span>
                <Mail aria-hidden="true" size={15} />{" "}
                {client.email || "E-mail não informado"}
              </span>
              <span>
                <MapPin aria-hidden="true" size={15} />{" "}
                {primaryAddress
                  ? `${primaryAddress.street}, ${primaryAddress.number || "s/n"} - ${primaryAddress.city}/${primaryAddress.state}`
                  : "Endereço não informado"}
              </span>
            </div>
            <details className="card-disclosure">
              <summary>Editar cadastro</summary>
              <form className="card-body form-grid single-column" action={updateClient}>
                <input type="hidden" name="id" value={client.id} />
                <label className="field">
                  Nome ou razão social
                  <input
                    name="name"
                    defaultValue={client.name}
                    required
                    minLength={2}
                    disabled={demo}
                  />
                </label>
                <label className="field">
                  Tipo de pessoa
                  <select
                    name="person_type"
                    defaultValue={client.person_type}
                    disabled={demo}
                  >
                    <option value="PF">Pessoa física</option>
                    <option value="PJ">Empresa</option>
                  </select>
                </label>
                <label className="field">
                  Etapa do relacionamento
                  <select
                    name="record_type"
                    defaultValue={client.record_type ?? "CLIENTE"}
                    disabled={demo}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="CLIENTE">Cliente</option>
                  </select>
                </label>
                <label className="field">
                  CPF ou CNPJ
                  <MaskedInput
                    name="document"
                    mask="document"
                    defaultValue={client.document ?? ""}
                    disabled={demo}
                  />
                </label>
                <label className="field">
                  Telefone / WhatsApp
                  <MaskedInput
                    name="phone"
                    mask="phone"
                    type="tel"
                    defaultValue={client.phone ?? ""}
                    disabled={demo}
                  />
                </label>
                <label className="field">
                  E-mail
                  <input
                    name="email"
                    type="email"
                    defaultValue={client.email ?? ""}
                    disabled={demo}
                  />
                </label>
                <label className="field">
                  Observações do cadastro
                  <textarea
                    name="notes"
                    defaultValue={client.notes ?? ""}
                    disabled={demo}
                  />
                </label>
                <SubmitButton className="button-full" disabled={demo}>
                  Salvar cadastro
                </SubmitButton>
              </form>
            </details>
          </article>

          <article className="card" id="nova-observacao">
            <div className="card-header">
              <div>
                <h2>Nova observação</h2>
                <p>Registre um contexto para a equipe.</p>
              </div>
            </div>
            <form className="card-body detail-stack" action={addClientNote}>
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
              <SubmitButton className="button-full" disabled={demo}>
                Salvar observação
              </SubmitButton>
            </form>
          </article>
        </aside>
      </section>
    </>
  );
}
