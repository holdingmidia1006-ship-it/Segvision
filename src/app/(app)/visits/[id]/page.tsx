import {
  ArrowLeft,
  CalendarPlus,
  Download,
  ExternalLink,
  FileUp,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { VisitStatusBadge } from "@/components/visit-status-badge";
import {
  addClientNote,
  convertVisitToService,
  updateVisit,
  uploadVisitAttachment,
} from "@/lib/actions";
import { getVisit, isDemoMode } from "@/lib/data";
import { formatDate, formatTime } from "@/lib/utils";

export default async function VisitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const visit = await getVisit(id);
  if (!visit) notFound();
  const demo = isDemoMode();
  const whatsapp = visit.clients?.phone?.replace(/\D/g, "");
  const googleUrl = new URL("https://calendar.google.com/calendar/render");
  googleUrl.searchParams.set("action", "TEMPLATE");
  googleUrl.searchParams.set("text", visit.title);
  googleUrl.searchParams.set(
    "dates",
    `${visit.scheduled_start_at.replace(/[-:]/g, "").replace(".000", "")}/${visit.scheduled_end_at.replace(/[-:]/g, "").replace(".000", "")}`,
  );
  googleUrl.searchParams.set("details", visit.description ?? "");
  googleUrl.searchParams.set("location", visit.address_snapshot ?? "");

  return (
    <>
      {query.created ? (
        <div className="success-message">Visita agendada com sucesso.</div>
      ) : null}
      <Link className="button button-secondary button-small" href="/visits">
        <ArrowLeft size={14} />
        Voltar às visitas
      </Link>

      <section className="service-hero visit-hero">
        <div>
          <VisitStatusBadge status={visit.status} />
          <h1>{visit.title}</h1>
          <p>{visit.clients?.name}</p>
        </div>
        <div className="visit-primary-actions">
          {whatsapp ? (
            <a className="button button-secondary" href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noreferrer">
              <MessageCircle size={16} />
              WhatsApp
            </a>
          ) : null}
          <a className="button button-secondary" href={googleUrl.toString()} target="_blank" rel="noreferrer">
            <CalendarPlus size={16} />
            Google Agenda
          </a>
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Resumo da visita</h2>
                <p>Informações para chegar preparado ao atendimento.</p>
              </div>
            </div>
            <div className="card-body info-grid">
              <div className="info-item">
                <span>Início</span>
                <strong>{formatDate(visit.scheduled_start_at)} às {formatTime(visit.scheduled_start_at)}</strong>
              </div>
              <div className="info-item">
                <span>Fim</span>
                <strong>{formatTime(visit.scheduled_end_at)}</strong>
              </div>
              <div className="info-item">
                <span>Prioridade</span>
                <strong>{visit.priority.toLowerCase()}</strong>
              </div>
              <div className="info-item">
                <span>Responsáveis</span>
                <strong>
                  {visit.visit_assignees?.map((item) => item.profiles?.full_name).filter(Boolean).join(", ") ||
                    "Criador da visita"}
                </strong>
              </div>
              <div className="info-item field-full">
                <span>Local</span>
                <strong><MapPin size={14} /> {visit.address_snapshot || "A confirmar"}</strong>
              </div>
            </div>
            <div className="card-body visit-description">
              <p>{visit.description || "Sem descrição adicional."}</p>
              {visit.next_action ? <p><strong>Próxima ação:</strong> {visit.next_action}</p> : null}
              {visit.outcome_summary ? <p><strong>Resultado:</strong> {visit.outcome_summary}</p> : null}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Anexos</h2>
                <p>Fotos, plantas e arquivos levantados em campo.</p>
              </div>
              <FileUp size={19} />
            </div>
            <div className="card-body simple-list">
              {(visit.visit_attachments ?? []).map((attachment) => (
                <div className="simple-list-item" key={attachment.id}>
                  <strong>{attachment.file_name}</strong>
                  {attachment.signed_url ? (
                    <a className="button button-secondary button-small" href={attachment.signed_url}>
                      <Download size={14} /> Baixar
                    </a>
                  ) : null}
                </div>
              ))}
              {!visit.visit_attachments?.length ? <span className="cell-subtitle">Nenhum anexo enviado.</span> : null}
              <form action={uploadVisitAttachment} className="inline-upload">
                <input type="hidden" name="visit_id" value={visit.id} />
                <input type="hidden" name="client_id" value={visit.client_id} />
                <label className="field">
                  Novo arquivo
                  <input name="attachment" type="file" required disabled={demo} />
                </label>
                <SubmitButton disabled={demo}>Enviar anexo</SubmitButton>
              </form>
            </div>
          </article>
        </div>

        <aside className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Atualizar visita</h2>
                <p>Conclua, reagende ou cancele.</p>
              </div>
            </div>
            <form className="card-body" action={updateVisit}>
              <input type="hidden" name="id" value={visit.id} />
              <div className="form-grid single-column">
                <label className="field">
                  Título
                  <input name="title" defaultValue={visit.title} required disabled={demo} />
                </label>
                <label className="field">
                  Status
                  <select name="status" defaultValue={visit.status} disabled={demo}>
                    <option value="AGENDADA">Agendada</option>
                    <option value="CONFIRMADA">Confirmada</option>
                    <option value="CONCLUIDA">Concluída</option>
                    <option value="CONVERTIDA_ORCAMENTO">Convertida</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </label>
                <label className="field">
                  Prioridade
                  <select name="priority" defaultValue={visit.priority} disabled={demo}>
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </label>
                <label className="field">
                  Endereço
                  <input name="address_snapshot" defaultValue={visit.address_snapshot ?? ""} disabled={demo} />
                </label>
                <label className="field">
                  Descrição
                  <textarea name="description" defaultValue={visit.description ?? ""} disabled={demo} />
                </label>
                <label className="field">
                  Reagendar início
                  <input name="scheduled_start_at" type="datetime-local" disabled={demo} />
                </label>
                <label className="field">
                  Reagendar fim
                  <input name="scheduled_end_at" type="datetime-local" disabled={demo} />
                </label>
                <label className="field">
                  Resultado
                  <textarea name="outcome_summary" defaultValue={visit.outcome_summary ?? ""} disabled={demo} />
                </label>
                <label className="field">
                  Próxima ação
                  <textarea name="next_action" defaultValue={visit.next_action ?? ""} disabled={demo} />
                </label>
                <label className="field">
                  Notas internas
                  <textarea name="internal_notes" defaultValue={visit.internal_notes ?? ""} disabled={demo} />
                </label>
              </div>
              <SubmitButton className="button-full" disabled={demo}>Salvar alterações</SubmitButton>
            </form>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Cliente</h2>
                <p>Acesse o histórico completo.</p>
              </div>
            </div>
            <div className="card-body detail-stack">
              <strong>{visit.clients?.name}</strong>
              {visit.clients?.phone ? <a href={`tel:${visit.clients.phone}`}><Phone size={14} /> {visit.clients.phone}</a> : null}
              <Link className="button button-secondary button-full" href={`/clients/${visit.client_id}`}>
                Ver cliente <ExternalLink size={15} />
              </Link>
            </div>
          </article>

          <article className="card">
            <div className="card-body">
              {visit.converted_service_id ? (
                <Link className="button button-primary button-full" href={`/services/${visit.converted_service_id}`}>
                  Abrir orçamento
                </Link>
              ) : (
                <form action={convertVisitToService}>
                  <input type="hidden" name="visit_id" value={visit.id} />
                  <SubmitButton className="button-full" disabled={demo}>
                    Converter em orçamento
                  </SubmitButton>
                </form>
              )}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Observação do cliente</h2>
                <p>Também aparecerá na linha do tempo.</p>
              </div>
            </div>
            <form className="card-body" action={addClientNote}>
              <input type="hidden" name="client_id" value={visit.client_id} />
              <input type="hidden" name="visit_id" value={visit.id} />
              <label className="field">
                Tipo
                <select name="note_type" defaultValue="TECNICA" disabled={demo}>
                  <option value="MANUAL">Geral</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="TECNICA">Técnica</option>
                </select>
              </label>
              <label className="field">
                Observação
                <textarea name="content" required disabled={demo} />
              </label>
              <SubmitButton className="button-full" disabled={demo}>Registrar</SubmitButton>
            </form>
          </article>
        </aside>
      </section>
    </>
  );
}
