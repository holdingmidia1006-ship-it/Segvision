import {
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { getDashboardData } from "@/lib/data";
import type { ServiceStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const maxCount = Math.max(...Object.values(data.counts), 1);
  const recent = data.services.slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Bom trabalho hoje"
        description="Acompanhe o que está em andamento, os valores do negócio e os próximos pontos de atenção."
        action={
          <Link className="button button-primary" href="/services/new">
            Novo orçamento
            <ArrowUpRight size={16} />
          </Link>
        }
      />

      <section className="stats-grid" aria-label="Indicadores principais">
        <StatCard
          label="Entradas consideradas"
          value={formatCurrency(data.revenue)}
          detail="Serviços aprovados, em garantia ou finalizados"
          icon={CircleDollarSign}
          tone="blue"
        />
        <StatCard
          label="Custos internos"
          value={formatCurrency(data.costs)}
          detail="Lançamentos reais registrados"
          icon={WalletCards}
          tone="amber"
        />
        <StatCard
          label="Margem apurada"
          value={formatCurrency(data.margin)}
          detail="Entradas menos custos reais"
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label="Tempo médio"
          value={`${data.averageDays.toFixed(1)} dias`}
          detail="Serviços finalizados com datas completas"
          icon={Clock3}
          tone="red"
        />
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Serviços recentes</h2>
              <p>Os últimos trabalhos movimentados pela equipe.</p>
            </div>
            <Link className="button button-secondary button-small" href="/services">
              Ver todos
            </Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((service) => (
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
                    <td>
                      <StatusBadge status={service.status} pulse />
                    </td>
                    <td>{formatCurrency(service.sale_amount)}</td>
                    <td>{formatDate(service.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div className="detail-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <h2>Operação por etapa</h2>
                <p>Onde os serviços estão agora.</p>
              </div>
              <BriefcaseBusiness size={19} color="#60758f" />
            </div>
            <div className="card-body status-list">
              {(Object.entries(data.counts) as [ServiceStatus, number][]).map(
                ([status, count]) => (
                  <div className="status-row" key={status}>
                    <div>
                      <StatusBadge status={status} pulse />
                      <div className="status-row-track">
                        <div
                          className="status-row-fill"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <strong aria-label={`${count} em ${statusLabel(status)}`}>
                      {count}
                    </strong>
                  </div>
                ),
              )}
            </div>
          </article>

          <article className="card">
            <div className="card-body">
              <div className="notice">
                <ReceiptText size={18} />
                <span>
                  O módulo fiscal está em modo assistido. Revise o tipo da nota
                  com a contabilidade antes de emitir.
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
