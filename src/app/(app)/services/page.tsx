import { ArrowRight, CalendarDays, Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getServices } from "@/lib/data";
import type { ServiceStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Serviços" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const services = await getServices();
  const search = query.q?.trim().toLowerCase() ?? "";
  const filtered = services.filter((service) => {
    const matchesSearch =
      !search ||
      service.title.toLowerCase().includes(search) ||
      service.clients?.name.toLowerCase().includes(search);
    const matchesStatus = !query.status || service.status === query.status;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Serviços"
        description="Cada registro nasce como orçamento e continua vivo até a execução, garantia e finalização."
        action={
          <Link className="button button-primary" href="/services/new">
            <Plus size={16} />
            Novo orçamento
          </Link>
        }
      />

      <form className="card" style={{ marginBottom: 18 }}>
        <div className="card-body form-grid form-grid-3">
          <label className="field">
            <span>
              <Search size={13} /> Buscar
            </span>
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Serviço ou cliente"
            />
          </label>
          <label className="field">
            <span>
              <Filter size={13} /> Status
            </span>
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">Todos os status</option>
              <option value="ORCAMENTO">Orçamento</option>
              <option value="EM_EXECUCAO">Em execução</option>
              <option value="GARANTIA">Garantia</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </label>
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <button className="button button-secondary" type="submit">
              Aplicar filtros
            </button>
          </div>
        </div>
      </form>

      {filtered.length ? (
        <article className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serviço e cliente</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Previsão</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <Link
                        className="cell-title"
                        href={`/services/${service.id}`}
                      >
                        {service.title}
                      </Link>
                      <span className="cell-subtitle">
                        {service.clients?.name ?? "Cliente não informado"}
                      </span>
                    </td>
                    <td>{service.service_types?.name ?? "Não definido"}</td>
                    <td>
                      <StatusBadge
                        status={service.status as ServiceStatus}
                        pulse
                      />
                    </td>
                    <td>
                      <span className="cell-title">
                        <CalendarDays
                          size={12}
                          style={{ display: "inline", marginRight: 5 }}
                        />
                        {formatDate(service.estimated_end_at)}
                      </span>
                    </td>
                    <td>{formatCurrency(service.sale_amount)}</td>
                    <td>
                      <Link
                        className="button button-secondary button-small"
                        href={`/services/${service.id}`}
                        aria-label={`Abrir ${service.title}`}
                      >
                        Abrir
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : (
        <article className="card">
          <EmptyState
            title="Nenhum serviço encontrado"
            description="Ajuste os filtros ou crie o primeiro orçamento para começar o fluxo operacional."
            action={
              <Link className="button button-primary" href="/services/new">
                Novo orçamento
              </Link>
            }
          />
        </article>
      )}
    </>
  );
}
