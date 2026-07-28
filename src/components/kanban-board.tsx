"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import type { Service, ServiceStatus } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const columns: ServiceStatus[] = [
  "ORCAMENTO",
  "EM_EXECUCAO",
  "GARANTIA",
  "FINALIZADO",
];

export function KanbanBoard({ services }: { services: Service[] }) {
  const [active, setActive] = useState<ServiceStatus>("ORCAMENTO");

  return (
    <div className="kanban-board">
      <div className="kanban-tabs" role="tablist" aria-label="Etapas do serviço">
        {columns.map((status) => {
          const count = services.filter((service) => service.status === status).length;
          return (
            <button
              key={status}
              className={cn(active === status && "active")}
              type="button"
              role="tab"
              aria-selected={active === status}
              aria-controls={`kanban-${status}`}
              onClick={() => setActive(status)}
            >
              <span>{statusLabel(status)}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <section className="kanban" aria-label="Serviços agrupados por status">
        {columns.map((status) => {
          const grouped = services.filter((service) => service.status === status);
          return (
            <article
              className="kanban-column"
              id={`kanban-${status}`}
              data-active={active === status}
              key={status}
              role="tabpanel"
            >
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
                      <ArrowRight aria-hidden="true" size={13} />
                    </div>
                  </Link>
                ))}
                {!grouped.length ? (
                  <div className="empty-state kanban-empty">
                    <p>Nenhum serviço nesta etapa.</p>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
