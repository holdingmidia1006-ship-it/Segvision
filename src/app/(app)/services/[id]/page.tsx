import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  MapPin,
  PlusCircle,
  ReceiptText,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { addServiceCost, updateServiceStatus } from "@/lib/actions";
import { getService, isDemoMode } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const service = await getService(id);
  if (!service) notFound();
  const demo = isDemoMode();
  const costs = service.service_costs ?? [];
  const realCost = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  const margin = Number(service.sale_amount) - realCost;

  return (
    <>
      {query.created ? (
        <div className="success-message">Orçamento criado com sucesso.</div>
      ) : null}
      <Link
        className="button button-secondary button-small"
        href="/services"
        style={{ marginBottom: 14 }}
      >
        <ArrowLeft size={14} />
        Voltar aos serviços
      </Link>

      <section className="service-hero">
        <div>
          <StatusBadge status={service.status} pulse />
          <h1>{service.title}</h1>
          <p>
            {service.clients?.name ?? "Cliente não informado"} •{" "}
            {service.service_types?.name ?? "Tipo não definido"}
          </p>
        </div>
        <div className="service-value">
          <span>Valor do serviço</span>
          <strong>{formatCurrency(service.sale_amount)}</strong>
        </div>
      </section>

      <section className="detail-grid">
        <div className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Dados do serviço</h2>
                <p>Informações comerciais e operacionais.</p>
              </div>
              <FileText size={19} color="#60758f" />
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <span>Cliente</span>
                  <strong>
                    <UserRound
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {service.clients?.name}
                  </strong>
                </div>
                <div className="info-item">
                  <span>Início previsto</span>
                  <strong>
                    <CalendarDays
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {formatDate(service.estimated_start_at)}
                  </strong>
                </div>
                <div className="info-item">
                  <span>Entrega prevista</span>
                  <strong>{formatDate(service.estimated_end_at)}</strong>
                </div>
                <div className="info-item">
                  <span>Local</span>
                  <strong>
                    <MapPin
                      size={13}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    Endereço do cliente
                  </strong>
                </div>
                <div className="info-item">
                  <span>Início real</span>
                  <strong>{formatDate(service.actual_start_at)}</strong>
                </div>
                <div className="info-item">
                  <span>Finalização real</span>
                  <strong>{formatDate(service.actual_end_at)}</strong>
                </div>
              </div>
              {service.description ? (
                <p
                  style={{
                    margin: "20px 0 0",
                    color: "#5f7187",
                    fontSize: 12,
                    lineHeight: 1.65,
                  }}
                >
                  {service.description}
                </p>
              ) : null}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Itens do orçamento</h2>
                <p>Valores visíveis no documento do cliente.</p>
              </div>
            </div>
            <div className="card-body">
              {service.service_items?.length ? (
                <div className="simple-list">
                  {service.service_items.map((item) => (
                    <div className="simple-list-item" key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <span>
                          {item.quantity} {item.unit} ×{" "}
                          {formatCurrency(item.unit_price)}
                        </span>
                      </div>
                      <strong>{formatCurrency(item.total_price)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="cell-subtitle">
                  Nenhum item detalhado neste serviço.
                </span>
              )}
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Equipe escalada</h2>
                <p>Valores históricos preservados no serviço.</p>
              </div>
              <UsersRound size={19} color="#60758f" />
            </div>
            <div className="card-body">
              {service.service_employees?.length ? (
                <div className="simple-list">
                  {service.service_employees.map((assignment) => (
                    <div className="simple-list-item" key={assignment.id}>
                      <div>
                        <strong>
                          {assignment.employees?.name ?? "Profissional"}
                        </strong>
                        <span>
                          Diária congelada em{" "}
                          {formatCurrency(assignment.daily_rate_snapshot)}
                        </span>
                      </div>
                      <span className="status-badge status-running">
                        Escalado
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="cell-subtitle">
                  Nenhum profissional escalado.
                </span>
              )}
            </div>
          </article>
        </div>

        <aside className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Próxima etapa</h2>
                <p>Atualize o status com um clique.</p>
              </div>
            </div>
            <form className="card-body" action={updateServiceStatus}>
              <input type="hidden" name="id" value={service.id} />
              <label className="field">
                Status atual
                <select
                  name="status"
                  defaultValue={service.status}
                  disabled={demo}
                >
                  <option value="ORCAMENTO">Orçamento</option>
                  <option value="EM_EXECUCAO">Em execução</option>
                  <option value="GARANTIA">Garantia</option>
                  <option value="FINALIZADO">Finalizado</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </label>
              <SubmitButton className="button-full" disabled={demo}>
                Atualizar etapa
              </SubmitButton>
            </form>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Previsto x real</h2>
                <p>O resultado financeiro deste trabalho.</p>
              </div>
            </div>
            <div className="card-body financial-box">
              <div className="financial-row">
                <span>Venda</span>
                <strong>{formatCurrency(service.sale_amount)}</strong>
              </div>
              <div className="financial-row">
                <span>Custo previsto</span>
                <strong>{formatCurrency(service.estimated_cost_amount)}</strong>
              </div>
              <div className="financial-row">
                <span>Custo real lançado</span>
                <strong>{formatCurrency(realCost)}</strong>
              </div>
              <div className="financial-row financial-total">
                <span>Margem real</span>
                <strong>{formatCurrency(margin)}</strong>
              </div>
            </div>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <h2>Custo interno</h2>
                <p>Não aparece no orçamento do cliente.</p>
              </div>
              <PlusCircle size={19} color="#60758f" />
            </div>
            <form className="card-body" action={addServiceCost}>
              <input type="hidden" name="service_id" value={service.id} />
              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <label className="field">
                  Categoria
                  <select name="category" disabled={demo}>
                    <option value="COMBUSTIVEL">Combustível</option>
                    <option value="ALMOCO">Almoço</option>
                    <option value="DIARIA">Diária</option>
                    <option value="MEIA_DIARIA">Meia diária</option>
                    <option value="BONIFICACAO">Bonificação</option>
                    <option value="MATERIAL_EXTRA">Material extra</option>
                    <option value="PEDAGIO">Pedágio</option>
                    <option value="ESTACIONAMENTO">Estacionamento</option>
                    <option value="ALUGUEL_EQUIPAMENTO">
                      Aluguel de equipamento
                    </option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </label>
                <label className="field">
                  Descrição
                  <input name="description" disabled={demo} />
                </label>
                <label className="field">
                  Valor
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    disabled={demo}
                  />
                </label>
                <label className="field">
                  Data
                  <input
                    name="cost_date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    disabled={demo}
                  />
                </label>
              </div>
              <SubmitButton className="button-full" disabled={demo}>
                Lançar custo
              </SubmitButton>
            </form>
          </article>

          <article className="card">
            <div className="card-body detail-stack">
              <a
                className="button button-primary button-full"
                href={`/api/services/${service.id}/quote`}
              >
                <Download size={16} />
                Gerar orçamento Word
              </a>
              <Link
                className="button button-secondary button-full"
                href={`/invoices?service=${service.id}`}
              >
                <ReceiptText size={16} />
                Preparar nota
              </Link>
            </div>
          </article>
        </aside>
      </section>
    </>
  );
}
