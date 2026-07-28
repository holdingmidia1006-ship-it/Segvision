import { Boxes, Building2, Info, ListPlus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-dialog";
import { MaskedInput } from "@/components/ui/masked-input";
import { Tabs } from "@/components/ui/tabs";
import { Toast } from "@/components/ui/toast";
import {
  createCatalogItem,
  createServiceType,
  deleteCatalogItem,
  deleteServiceType,
  updateCatalogItem,
  updateCompanySettings,
  updateServiceType,
} from "@/lib/actions";
import {
  getCatalogItems,
  getCompanySettings,
  getCurrentProfile,
  getServiceTypes,
  isDemoMode,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    saved?: string;
  }>;
}) {
  const demo = isDemoMode();
  const profile = demo ? null : await getCurrentProfile();
  if (!demo && profile?.role !== "ADMIN") redirect("/dashboard");

  const [types, items, company, query] = await Promise.all([
    getServiceTypes(),
    getCatalogItems(),
    getCompanySettings(),
    searchParams,
  ]);

  const typesContent = (
    <article className="card settings-panel">
      <div className="card-header">
        <div>
          <h2>Tipos de serviço</h2>
          <p>Categorias usadas para filtrar e comparar trabalhos.</p>
        </div>
        <ListPlus aria-hidden="true" size={19} />
      </div>
      <div className="card-body settings-records">
        {types.map((type) => (
          <details className="record-disclosure" key={type.id}>
            <summary>
              <span>
                <strong>{type.name}</strong>
                <small>{type.description || "Sem descrição"}</small>
              </span>
              <span
                className={`ui-badge ${
                  type.active ? "ui-badge-success" : "ui-badge-neutral"
                }`}
              >
                {type.active ? "Ativo" : "Inativo"}
              </span>
            </summary>
            <form className="form-grid single-column" action={updateServiceType}>
              <input type="hidden" name="id" value={type.id} />
              <label className="field">
                Nome
                <input
                  name="name"
                  defaultValue={type.name}
                  required
                  disabled={demo}
                />
              </label>
              <label className="field">
                Descrição
                <input
                  name="description"
                  defaultValue={type.description ?? ""}
                  disabled={demo}
                />
              </label>
              <label className="checkbox-card">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={type.active}
                  disabled={demo}
                />
                Disponível em novos orçamentos
              </label>
              <SubmitButton disabled={demo}>Salvar tipo</SubmitButton>
            </form>
            {!demo ? (
              <form className="record-danger" action={deleteServiceType}>
                <input type="hidden" name="id" value={type.id} />
                <ConfirmSubmitButton
                  title={`Excluir ${type.name}?`}
                  description="Orçamentos existentes serão preservados, mas perderão o vínculo com este tipo."
                  confirmLabel="Excluir tipo"
                >
                  <Trash2 aria-hidden="true" size={14} /> Excluir
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </details>
        ))}
      </div>
      <details className="card-disclosure">
        <summary>Adicionar tipo de serviço</summary>
        <form className="card-body form-grid single-column" action={createServiceType}>
          <label className="field">
            Nome
            <input name="name" required disabled={demo} />
          </label>
          <label className="field">
            Descrição
            <input name="description" disabled={demo} />
          </label>
          <SubmitButton disabled={demo}>Adicionar tipo</SubmitButton>
        </form>
      </details>
    </article>
  );

  const catalogContent = (
    <article className="card settings-panel">
      <div className="card-header">
        <div>
          <h2>Catálogo base</h2>
          <p>Itens reaproveitáveis com venda e custo padrão.</p>
        </div>
        <Boxes aria-hidden="true" size={19} />
      </div>
      <div className="card-body settings-records">
        {items.map((item) => (
          <details className="record-disclosure" key={item.id}>
            <summary>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.unit} • custo {formatCurrency(item.standard_cost)}
                </small>
              </span>
              <strong>{formatCurrency(item.sale_price)}</strong>
            </summary>
            <form className="form-grid" action={updateCatalogItem}>
              <input type="hidden" name="id" value={item.id} />
              <label className="field field-full">
                Nome
                <input
                  name="name"
                  defaultValue={item.name}
                  required
                  disabled={demo}
                />
              </label>
              <label className="field">
                Unidade
                <input
                  name="unit"
                  defaultValue={item.unit}
                  required
                  disabled={demo}
                />
              </label>
              <label className="field">
                Preço de venda
                <input
                  name="sale_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={item.sale_price}
                  disabled={demo}
                />
              </label>
              <label className="field">
                Custo padrão
                <input
                  name="standard_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={item.standard_cost}
                  disabled={demo}
                />
              </label>
              <label className="checkbox-card">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={item.active}
                  disabled={demo}
                />
                Disponível em novos orçamentos
              </label>
              <SubmitButton disabled={demo}>Salvar item</SubmitButton>
            </form>
            {!demo ? (
              <form className="record-danger" action={deleteCatalogItem}>
                <input type="hidden" name="id" value={item.id} />
                <ConfirmSubmitButton
                  title={`Excluir ${item.name}?`}
                  description="Itens já usados em orçamentos serão preservados, mas perderão o vínculo com o catálogo."
                  confirmLabel="Excluir item"
                >
                  <Trash2 aria-hidden="true" size={14} /> Excluir
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </details>
        ))}
      </div>
      <details className="card-disclosure">
        <summary>Adicionar item ao catálogo</summary>
        <form className="card-body form-grid" action={createCatalogItem}>
          <label className="field field-full">
            Nome do item
            <input name="name" required disabled={demo} />
          </label>
          <label className="field">
            Unidade
            <input name="unit" defaultValue="un" required disabled={demo} />
          </label>
          <label className="field">
            Preço de venda
            <input
              name="sale_price"
              type="number"
              min="0"
              step="0.01"
              disabled={demo}
            />
          </label>
          <label className="field">
            Custo padrão
            <input
              name="standard_cost"
              type="number"
              min="0"
              step="0.01"
              disabled={demo}
            />
          </label>
          <SubmitButton disabled={demo}>Adicionar item</SubmitButton>
        </form>
      </details>
    </article>
  );

  const companyContent = company ? (
    <article className="card settings-panel">
      <div className="card-header">
        <div>
          <h2>Empresa e PDF</h2>
          <p>Dados do prestador e condições padrão usadas no orçamento.</p>
        </div>
        <Building2 aria-hidden="true" size={19} />
      </div>
      <form className="card-body form-grid" action={updateCompanySettings}>
        <label className="field">
          Razão social
          <input
            name="legal_name"
            defaultValue={company.legal_name}
            required
            disabled={demo}
          />
        </label>
        <label className="field">
          Nome fantasia
          <input
            name="trade_name"
            defaultValue={company.trade_name}
            required
            disabled={demo}
          />
        </label>
        <label className="field">
          CNPJ
          <MaskedInput
            name="document"
            mask="document"
            defaultValue={company.document}
            required
            disabled={demo}
          />
        </label>
        <label className="field">
          Telefone
          <MaskedInput
            name="phone"
            mask="phone"
            type="tel"
            defaultValue={company.phone ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          E-mail
          <input
            name="email"
            type="email"
            defaultValue={company.email ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Instagram
          <input
            name="instagram"
            defaultValue={company.instagram ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Rua
          <input
            name="street"
            defaultValue={company.street ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Número
          <input
            name="number"
            defaultValue={company.number ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Bairro
          <input
            name="district"
            defaultValue={company.district ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Complemento
          <input
            name="complement"
            defaultValue={company.complement ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Cidade
          <input
            name="city"
            defaultValue={company.city}
            required
            disabled={demo}
          />
        </label>
        <label className="field">
          Estado
          <input
            name="state"
            defaultValue={company.state}
            maxLength={2}
            required
            disabled={demo}
          />
        </label>
        <label className="field">
          CEP
          <MaskedInput
            name="postal_code"
            mask="postal-code"
            defaultValue={company.postal_code ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Responsável
          <input
            name="responsible_name"
            defaultValue={company.responsible_name ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Cargo do responsável
          <input
            name="responsible_role"
            defaultValue={company.responsible_role ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field">
          Validade padrão em dias
          <input
            name="default_validity_days"
            type="number"
            min="1"
            defaultValue={company.default_validity_days}
            required
            disabled={demo}
          />
        </label>
        <label className="field field-full">
          Forma de pagamento padrão
          <textarea
            name="default_payment_terms"
            defaultValue={company.default_payment_terms ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field field-full">
          Prazo de execução padrão
          <textarea
            name="default_execution_deadline"
            defaultValue={company.default_execution_deadline ?? ""}
            disabled={demo}
          />
        </label>
        <label className="field field-full">
          Garantia padrão
          <textarea
            name="default_warranty_terms"
            defaultValue={company.default_warranty_terms ?? ""}
            disabled={demo}
          />
        </label>
        <SubmitButton disabled={demo}>Salvar empresa e padrões</SubmitButton>
      </form>
    </article>
  ) : (
    <div className="notice notice-warn">
      <Info aria-hidden="true" size={18} />
      <span>Os dados da empresa ainda não estão disponíveis.</span>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Administração"
        title="Configurações"
        description="Padronize o catálogo e os dados usados em novos orçamentos."
      />
      {query.created ? <Toast>Novo cadastro adicionado.</Toast> : null}
      {query.saved ? <Toast>Configurações atualizadas.</Toast> : null}
      {query.deleted ? <Toast>Cadastro excluído.</Toast> : null}
      <div className="notice" style={{ marginBottom: 18 }}>
        <Info aria-hidden="true" size={18} />
        <span>
          Alterações feitas aqui afetam novos orçamentos. PDFs já gerados não
          são modificados.
        </span>
      </div>
      <Tabs
        items={[
          { id: "empresa", label: "Empresa e PDF", content: companyContent },
          { id: "tipos", label: "Tipos de serviço", content: typesContent },
          { id: "catalogo", label: "Catálogo", content: catalogContent },
        ]}
      />
    </>
  );
}
