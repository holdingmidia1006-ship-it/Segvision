import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createClient, deleteClient } from "@/lib/actions";
import { getClients, isDemoMode } from "@/lib/data";

export const metadata = { title: "Clientes" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const clients = await getClients();
  const demo = isDemoMode();
  const query = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        description="Centralize contatos e endereços de obra para não preencher as mesmas informações em cada orçamento."
        action={
          <a className="button button-primary" href="#novo-cliente">
            <Plus size={16} />
            Novo cliente
          </a>
        }
      />
      {query.created ? (
        <div className="success-message">Cliente cadastrado com sucesso.</div>
      ) : null}

      {clients.length ? (
        <section className="list-grid">
          {clients.map((client) => {
            const Icon = client.person_type === "PJ" ? Building2 : UserRound;
            const address = client.client_addresses?.find(
              (item) => item.is_primary,
            );
            return (
              <article className="entity-card" key={client.id}>
                <div className="entity-card-top">
                  <div>
                    <h3>{client.name}</h3>
                    <p>
                      {client.person_type === "PJ"
                        ? "Pessoa jurídica"
                        : "Pessoa física"}
                      {client.document ? ` • ${client.document}` : ""}
                    </p>
                  </div>
                  <div className="stat-icon stat-icon-blue">
                    <Icon size={19} />
                  </div>
                </div>
                <div className="entity-meta">
                  <span>
                    <Phone size={13} />
                    {client.phone || "Telefone não informado"}
                  </span>
                  <span>
                    <Mail size={13} />
                    {client.email || "E-mail não informado"}
                  </span>
                  <span>
                    <MapPin size={13} />
                    {address
                      ? `${address.street}, ${address.number ?? "s/n"}`
                      : "Endereço não informado"}
                  </span>
                </div>
                <div className="entity-actions">
                  <span className="status-badge status-running">
                    {client.active ? "Ativo" : "Inativo"}
                  </span>
                  {!demo ? (
                    <form action={deleteClient}>
                      <input type="hidden" name="id" value={client.id} />
                      <button
                        className="button button-danger button-small"
                        type="submit"
                        aria-label={`Excluir ${client.name}`}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <article className="card">
          <EmptyState
            title="Nenhum cliente cadastrado ainda"
            description="Cadastre o primeiro cliente para criar orçamentos e acompanhar os serviços."
          />
        </article>
      )}

      <form
        id="novo-cliente"
        className="card form-card"
        action={createClient}
        style={{ marginTop: 22 }}
      >
        <div className="form-section">
          <h2>Novo cliente</h2>
          <p>Dados usados nos serviços, documentos e notas preparadas.</p>
          <div className="form-grid">
            <label className="field">
              Nome completo ou razão social
              <input name="name" required minLength={2} disabled={demo} />
            </label>
            <label className="field">
              Tipo de pessoa
              <select name="person_type" defaultValue="PF" disabled={demo}>
                <option value="PF">Pessoa física</option>
                <option value="PJ">Pessoa jurídica</option>
              </select>
            </label>
            <label className="field">
              CPF ou CNPJ
              <input name="document" disabled={demo} />
            </label>
            <label className="field">
              Telefone
              <input name="phone" disabled={demo} />
            </label>
            <label className="field">
              E-mail
              <input name="email" type="email" disabled={demo} />
            </label>
            <label className="field">
              Observações
              <input name="notes" disabled={demo} />
            </label>
          </div>
        </div>
        <div className="form-section">
          <h3>Endereço principal</h3>
          <p>O local padrão pode ser alterado ao criar cada serviço.</p>
          <div className="form-grid form-grid-3">
            <label className="field">
              Identificação
              <input
                name="address_label"
                defaultValue="Principal"
                disabled={demo}
              />
            </label>
            <label className="field field-full">
              Rua ou avenida
              <input name="street" disabled={demo} />
            </label>
            <label className="field">
              Número
              <input name="number" disabled={demo} />
            </label>
            <label className="field">
              Complemento
              <input name="complement" disabled={demo} />
            </label>
            <label className="field">
              Bairro
              <input name="district" disabled={demo} />
            </label>
            <label className="field">
              Cidade
              <input name="city" disabled={demo} />
            </label>
            <label className="field">
              Estado
              <input name="state" defaultValue="SP" maxLength={2} disabled={demo} />
            </label>
            <label className="field">
              CEP
              <input name="postal_code" disabled={demo} />
            </label>
          </div>
        </div>
        <div className="form-actions">
          {demo ? (
            <span className="notice">Conecte o Supabase para salvar cadastros.</span>
          ) : null}
          <SubmitButton disabled={demo}>Salvar cliente</SubmitButton>
        </div>
      </form>
    </>
  );
}
