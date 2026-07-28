import { BadgeDollarSign, Phone, Plus, Search, Trash2, UserCog } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-dialog";
import { MaskedInput } from "@/components/ui/masked-input";
import { Toast } from "@/components/ui/toast";
import { createEmployee, deleteEmployee, updateEmployee } from "@/lib/actions";
import { getCurrentProfile, getEmployees, isDemoMode } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Equipe" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; q?: string; updated?: string }>;
}) {
  const demo = isDemoMode();
  const profile = demo ? null : await getCurrentProfile();
  if (!demo && profile?.role !== "ADMIN") redirect("/dashboard");

  const employees = await getEmployees();
  const query = await searchParams;
  const search = query.q?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const filtered = employees.filter((employee) =>
    [employee.name, employee.phone, employee.document]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(search)),
  );

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
        <Toast>Profissional cadastrado com sucesso.</Toast>
      ) : null}
      {query.updated ? <Toast>Profissional atualizado.</Toast> : null}

      <form className="card list-toolbar" role="search">
        <label className="field">
          <span>
            <Search aria-hidden="true" size={14} />
            Buscar profissional
          </span>
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Nome, telefone ou CPF"
          />
        </label>
        <button className="button button-secondary" type="submit">
          Buscar
        </button>
        {query.q ? (
          <Link className="button button-ghost" href="/team">
            Limpar
          </Link>
        ) : null}
      </form>

      {filtered.length ? (
        <section className="list-grid">
          {filtered.map((employee) => (
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
                    <ConfirmSubmitButton
                      title={`Excluir ${employee.name}?`}
                      description="A exclusão será bloqueada se o profissional estiver vinculado a um serviço. Prefira inativar cadastros com histórico."
                      confirmLabel="Excluir profissional"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                      Excluir
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </div>
              {!demo ? (
                <details className="entity-edit">
                  <summary>Editar profissional</summary>
                  <form className="form-grid single-column" action={updateEmployee}>
                    <input type="hidden" name="id" value={employee.id} />
                    <label className="field">
                      Nome
                      <input name="name" defaultValue={employee.name} required />
                    </label>
                    <label className="field">
                      CPF
                      <MaskedInput
                        name="document"
                        mask="document"
                        defaultValue={employee.document ?? ""}
                      />
                    </label>
                    <label className="field">
                      Telefone
                      <MaskedInput
                        name="phone"
                        mask="phone"
                        type="tel"
                        defaultValue={employee.phone ?? ""}
                      />
                    </label>
                    <label className="field">
                      Valor da diária
                      <input
                        name="daily_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={employee.daily_rate}
                      />
                    </label>
                    <label className="field">
                      Valor da meia diária
                      <input
                        name="half_daily_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={employee.half_daily_rate}
                      />
                    </label>
                    <label className="field">
                      Bonificação padrão
                      <input
                        name="default_bonus"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={employee.default_bonus}
                      />
                    </label>
                    <label className="field">
                      Observações
                      <textarea name="notes" defaultValue={employee.notes ?? ""} />
                    </label>
                    <label className="checkbox-card">
                      <input
                        name="active"
                        type="checkbox"
                        defaultChecked={employee.active}
                      />
                      Disponível para novos serviços
                    </label>
                    <SubmitButton>Salvar profissional</SubmitButton>
                  </form>
                </details>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <article className="card">
          <EmptyState
            title="Nenhum profissional cadastrado"
            description={
              search
                ? "Nenhum profissional corresponde à busca."
                : "Cadastre a equipe para escalar pessoas nos serviços e preservar o custo histórico."
            }
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
              <MaskedInput name="document" mask="document" disabled={demo} />
            </label>
            <label className="field">
              Telefone
              <MaskedInput name="phone" mask="phone" type="tel" disabled={demo} />
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
