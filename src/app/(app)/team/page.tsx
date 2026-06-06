import { BadgeDollarSign, Phone, Plus, Trash2, UserCog } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createEmployee, deleteEmployee } from "@/lib/actions";
import { getEmployees, isDemoMode } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Equipe" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const employees = await getEmployees();
  const demo = isDemoMode();
  const query = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Equipe"
        description="Registre funcionários e prestadores. Os valores são congelados quando entram em um serviço."
        action={
          <a className="button button-primary" href="#novo-profissional">
            <Plus size={16} />
            Novo profissional
          </a>
        }
      />
      {query.created ? (
        <div className="success-message">Profissional cadastrado com sucesso.</div>
      ) : null}

      {employees.length ? (
        <section className="list-grid">
          {employees.map((employee) => (
            <article className="entity-card" key={employee.id}>
              <div className="entity-card-top">
                <div>
                  <h3>{employee.name}</h3>
                  <p>{employee.document || "Documento não informado"}</p>
                </div>
                <div className="stat-icon stat-icon-green">
                  <UserCog size={19} />
                </div>
              </div>
              <div className="entity-meta">
                <span>
                  <Phone size={13} />
                  {employee.phone || "Telefone não informado"}
                </span>
                <span>
                  <BadgeDollarSign size={13} />
                  Diária {formatCurrency(employee.daily_rate)} • meia{" "}
                  {formatCurrency(employee.half_daily_rate)}
                </span>
                <span>
                  <BadgeDollarSign size={13} />
                  Bônus padrão {formatCurrency(employee.default_bonus)}
                </span>
              </div>
              <div className="entity-actions">
                <span className="status-badge status-running">
                  {employee.active ? "Disponível" : "Inativo"}
                </span>
                {!demo ? (
                  <form action={deleteEmployee}>
                    <input type="hidden" name="id" value={employee.id} />
                    <button className="button button-danger button-small">
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <article className="card">
          <EmptyState
            title="Nenhum profissional cadastrado"
            description="Cadastre a equipe para escalar pessoas nos serviços e preservar o custo histórico."
          />
        </article>
      )}

      <form
        id="novo-profissional"
        className="card form-card"
        action={createEmployee}
        style={{ marginTop: 22 }}
      >
        <div className="form-section">
          <h2>Novo profissional</h2>
          <p>Os valores atuais serão usados como snapshot em novos serviços.</p>
          <div className="form-grid">
            <label className="field">
              Nome completo
              <input name="name" required disabled={demo} />
            </label>
            <label className="field">
              CPF
              <input name="document" disabled={demo} />
            </label>
            <label className="field">
              Telefone
              <input name="phone" disabled={demo} />
            </label>
            <label className="field">
              Valor da diária
              <input
                name="daily_rate"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
            <label className="field">
              Valor da meia diária
              <input
                name="half_daily_rate"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
            <label className="field">
              Bonificação padrão
              <input
                name="default_bonus"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
            <label className="field field-full">
              Observações
              <textarea name="notes" disabled={demo} />
            </label>
          </div>
        </div>
        <div className="form-actions">
          {demo ? (
            <span className="notice">Conecte o Supabase para salvar cadastros.</span>
          ) : null}
          <SubmitButton disabled={demo}>Salvar profissional</SubmitButton>
        </div>
      </form>
    </>
  );
}
