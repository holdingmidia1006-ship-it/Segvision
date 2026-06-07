import { Boxes, Info, ListPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createCatalogItem, createServiceType } from "@/lib/actions";
import {
  getCatalogItems,
  getCurrentProfile,
  getServiceTypes,
  isDemoMode,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const demo = isDemoMode();
  const profile = demo ? null : await getCurrentProfile();
  if (!demo && profile?.role !== "ADMIN") redirect("/dashboard");

  const [types, items] = await Promise.all([
    getServiceTypes(),
    getCatalogItems(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Base padronizada"
        title="Configurações"
        description="Padronize tipos de serviço e itens usados nos orçamentos para melhorar as análises."
      />
      <div className="notice" style={{ marginBottom: 18 }}>
        <Info size={18} />
        <span>
          Nomes padronizados evitam que o mesmo serviço apareça de várias formas
          no dashboard.
        </span>
      </div>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Tipos de serviço</h2>
              <p>Categorias usadas para filtrar e comparar trabalhos.</p>
            </div>
            <ListPlus size={19} color="#60758f" />
          </div>
          <div className="card-body simple-list">
            {types.map((type) => (
              <div className="simple-list-item" key={type.id}>
                <div>
                  <strong>{type.name}</strong>
                  <span>{type.description || "Sem descrição"}</span>
                </div>
                <span className="status-badge status-running">Ativo</span>
              </div>
            ))}
          </div>
          <form className="form-section" action={createServiceType}>
            <div className="form-grid">
              <label className="field">
                Nome
                <input name="name" required disabled={demo} />
              </label>
              <label className="field">
                Descrição
                <input name="description" disabled={demo} />
              </label>
            </div>
            <SubmitButton
              className="button-full"
              disabled={demo}
            >
              Adicionar tipo
            </SubmitButton>
          </form>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <h2>Catálogo base</h2>
              <p>Itens reaproveitáveis com venda e custo padrão.</p>
            </div>
            <Boxes size={19} color="#60758f" />
          </div>
          <div className="card-body simple-list">
            {items.map((item) => (
              <div className="simple-list-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.unit} • custo {formatCurrency(item.standard_cost)}
                  </span>
                </div>
                <strong>{formatCurrency(item.sale_price)}</strong>
              </div>
            ))}
          </div>
          <form className="form-section" action={createCatalogItem}>
            <div className="form-grid">
              <label className="field field-full">
                Nome do item
                <input name="name" required disabled={demo} />
              </label>
              <label className="field">
                Unidade
                <input name="unit" defaultValue="un" disabled={demo} />
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
            </div>
            <SubmitButton className="button-full" disabled={demo}>
              Adicionar item
            </SubmitButton>
          </form>
        </article>
      </section>
    </>
  );
}
