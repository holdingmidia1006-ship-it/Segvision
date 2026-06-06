import { ArrowRight, Layers3 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { getServices } from "@/lib/data";
import type { ServiceStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Quadro de Serviços" };

const columns: ServiceStatus[] = [
  "ORCAMENTO",
  "EM_EXECUCAO",
  "GARANTIA",
  "FINALIZADO",
];

export default async function BoardPage() {
  const services = await getServices();

  return (
    <>
      <PageHeader
        eyebrow="Operação visual"
        title="Quadro de Serviços"
        description="Veja rapidamente o que está aguardando resposta, em execução, em garantia ou já encerrado."
        action={
          <Link className="button button-primary" href="/services/new">
            Novo orçamento
          </Link>
        }
      />
      <div className="notice" style={{ marginBottom: 18 }}>
        <Layers3 size={18} />
        <span>
          Cada cor é acompanhada por texto e ícone. A animação suave aparece
          apenas nos serviços em execução e respeita a redução de movimento do
          sistema.
        </span>
      </div>
      <section className="kanban" aria-label="Serviços agrupados por status">
        {columns.map((status) => {
          const grouped = services.filter((service) => service.status === status);
          return (
            <article className="kanban-column" key={status}>
              <header className="kanban-header">
                <strong>{statusLabel(status)}</strong>
                <span>{grouped.length}</span>
              </header>
              <div className="kanban-stack">
                {grouped.map((service) => (
                  <Link
                    className="kanban-card"
                    href={`/services/${service.id}`}
                    key={service.id}
                  >
                    <StatusBadge status={service.status} pulse />
                    <h3>{service.title}</h3>
                    <p>{service.clients?.name ?? "Cliente não informado"}</p>
                    <div className="kanban-card-footer">
                      <span>{formatCurrency(service.sale_amount)}</span>
                      <span>
                        {status === "GARANTIA"
                          ? `até ${formatDate(service.warranty_until)}`
                          : formatDate(service.estimated_end_at)}
                      </span>
                      <ArrowRight size={13} />
                    </div>
                  </Link>
                ))}
                {!grouped.length ? (
                  <div className="empty-state" style={{ minHeight: 180 }}>
                    <p>Nenhum serviço nesta etapa.</p>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
