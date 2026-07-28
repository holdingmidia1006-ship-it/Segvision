import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-dialog";
import { MaskedInput } from "@/components/ui/masked-input";
import { Pagination } from "@/components/ui/pagination";
import { Toast } from "@/components/ui/toast";
import { createClient, deleteClient } from "@/lib/actions";
import { getClients, getCurrentProfile, isDemoMode } from "@/lib/data";

export const metadata = { title: "Clientes" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; page?: string; q?: string }>;
}) {
  const clients = await getClients();
  const demo = isDemoMode();
  const profile = demo ? null : await getCurrentProfile();
  const isAdmin = demo || profile?.role === "ADMIN";
  const query = await searchParams;
  const search = query.q?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const filtered = clients.filter((client) =>
    [client.name, client.phone, client.email, client.document]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(search)),
  );
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1),
  );
  const visibleClients = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <>
      <PageHeader
        eyebrow="Passo 1"
        title="Clientes"
        description="Cadastre o contato uma vez. Os dados serão reaproveitados nas visitas e nos orçamentos."
        action={
          <a className="button button-primary" href="#novo-cliente">
            <Plus size={16} />
            Novo cliente
          </a>
        }
      />
      {query.created ? (
        <Toast>Cliente cadastrado com sucesso.</Toast>
      ) : null}

      <form className="card list-toolbar" role="search">
        <label className="field">
          <span>
            <Search aria-hidden="true" size={14} />
            Buscar cliente
          </span>
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Nome, telefone, documento ou e-mail"
          />
        </label>
        <button className="button button-secondary" type="submit">
          Buscar
        </button>
        {query.q ? (
          <Link className="button button-ghost" href="/clients">
            Limpar
          </Link>
        ) : null}
      </form>

      {visibleClients.length ? (
        <section className="list-grid">
          {visibleClients.map((client) => {
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
                  {!demo && isAdmin ? (
                    <form action={deleteClient}>
                      <input type="hidden" name="id" value={client.id} />
                      <ConfirmSubmitButton
                        title={`Excluir ${client.name}?`}
                        description="Endereços, contatos e visitas vinculados podem ser removidos. Se houver orçamento, o banco bloqueará a exclusão."
                        confirmLabel="Excluir cliente"
                      >
                        <Trash2 aria-hidden="true" size={14} />
                        Excluir
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                  <Link
                    className="button button-secondary button-small"
                    href={`/clients/${client.id}`}
                  >
                    Abrir cliente
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <article className="card">
          <EmptyState
            title="Nenhum cliente cadastrado"
            description={
              search
                ? "Nenhum cliente corresponde à busca. Limpe o filtro e tente novamente."
                : "Comece pelo nome e telefone. Os demais dados são opcionais."
            }
          />
        </article>
      )}
      <Pagination
        basePath={search ? `/clients?q=${encodeURIComponent(query.q ?? "")}` : "/clients"}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      <form
        id="novo-cliente"
        className="card form-card"
        action={createClient}
        style={{ marginTop: 22 }}
      >
        <div className="form-section">
          <h2>Novo cliente</h2>
          <p>Para começar, informe apenas quem é o cliente e como falar com ele.</p>
          <div className="form-grid">
            <label className="field field-full">
              Nome completo ou razão social
              <input name="name" required minLength={2} disabled={demo} />
            </label>
            <label className="field">
              Telefone / WhatsApp
              <MaskedInput name="phone" mask="phone" type="tel" disabled={demo} />
            </label>
            <label className="field">
              Tipo
              <select name="person_type" defaultValue="PF" disabled={demo}>
                <option value="PF">Pessoa física</option>
                <option value="PJ">Empresa</option>
              </select>
            </label>
            <label className="field">
              CPF ou CNPJ
              <MaskedInput name="document" mask="document" disabled={demo} />
            </label>
            <label className="field">
              E-mail
              <input name="email" type="email" disabled={demo} />
            </label>
          </div>
        </div>

        <details className="form-disclosure">
          <summary>
            <span>
              Adicionar endereço e observações
              <small>Opcional, mas útil para gerar o orçamento</small>
            </span>
          </summary>
          <div className="form-section">
            <div className="form-grid form-grid-3">
              <label className="field field-full">
                Rua ou avenida
                <input name="street" disabled={demo} />
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
                <input name="city" disabled={demo} />
              </label>
              <label className="field">
                Estado
                <input name="state" defaultValue="GO" maxLength={2} disabled={demo} />
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
              <label className="field">
                Identificação
                <input
                  name="address_label"
                  defaultValue="Principal"
                  disabled={demo}
                />
              </label>
              <label className="field field-full">
                Observações
                <textarea name="notes" disabled={demo} />
              </label>
            </div>
          </div>
        </details>

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
