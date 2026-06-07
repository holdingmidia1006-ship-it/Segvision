import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createService } from "@/lib/actions";
import {
  getClients,
  getEmployees,
  getServiceTypes,
  isDemoMode,
} from "@/lib/data";

export const metadata = { title: "Novo orçamento" };

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; visit?: string }>;
}) {
  const query = await searchParams;
  const [clients, employees, serviceTypes] = await Promise.all([
    getClients(),
    getEmployees(),
    getServiceTypes(),
  ]);
  const demo = isDemoMode();

  return (
    <>
      <PageHeader
        eyebrow="Serviços"
        title="Novo orçamento"
        description="Comece com o essencial. Depois da aprovação, este mesmo registro acompanha toda a execução."
        action={
          <Link className="button button-secondary" href="/services">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      />

      <form className="card form-card" action={createService}>
        <div className="form-section">
          <h2>Dados principais</h2>
          <p>Identifique o trabalho, o cliente e os valores previstos.</p>
          <div className="form-grid">
            <label className="field field-full">
              Título do serviço
              <input
                name="title"
                required
                placeholder="Ex.: Instalação das câmeras do depósito"
                disabled={demo}
              />
            </label>
            <label className="field">
              Cliente
              <select
                name="client_id"
                defaultValue={query.client ?? ""}
                required
                disabled={demo}
              >
                <option value="">Selecione</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Tipo de serviço
              <select name="service_type_id" disabled={demo}>
                <option value="">Selecione</option>
                {serviceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Valor de venda
              <input
                name="sale_amount"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
            <label className="field">
              Custo previsto
              <input
                name="estimated_cost_amount"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
            <label className="field">
              Início previsto
              <input name="estimated_start_at" type="date" disabled={demo} />
            </label>
            <label className="field">
              Entrega prevista
              <input name="estimated_end_at" type="date" disabled={demo} />
            </label>
            <label className="field field-full">
              Descrição do trabalho
              <textarea
                name="description"
                placeholder="Explique o que será feito."
                disabled={demo}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Equipe prevista</h3>
          <p>
            Ao salvar, o sistema congela os valores atuais de diária e bônus.
          </p>
          <div className="checkbox-grid">
            {employees.map((employee) => (
              <label className="checkbox-card" key={employee.id}>
                <input
                  type="checkbox"
                  name="employee_ids"
                  value={employee.id}
                  disabled={demo}
                />
                <span>{employee.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Primeiro item do orçamento</h3>
          <p>Outros itens podem ser adicionados na evolução do serviço.</p>
          <div className="form-grid form-grid-3">
            <label className="field field-full">
              Descrição
              <input
                name="item_description"
                placeholder="Ex.: Câmera IP 4MP instalada"
                disabled={demo}
              />
            </label>
            <label className="field">
              Quantidade
              <input
                name="item_quantity"
                type="number"
                min="0"
                step="0.01"
                defaultValue="1"
                disabled={demo}
              />
            </label>
            <label className="field">
              Unidade
              <input name="item_unit" defaultValue="un" disabled={demo} />
            </label>
            <label className="field">
              Valor unitário
              <input
                name="item_unit_price"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
            <label className="field">
              Custo unitário
              <input
                name="item_unit_cost"
                type="number"
                min="0"
                step="0.01"
                disabled={demo}
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Observações</h3>
          <div className="form-grid">
            <label className="field">
              Para o cliente
              <textarea name="customer_notes" disabled={demo} />
            </label>
            <label className="field">
              Internas
              <textarea name="internal_notes" disabled={demo} />
            </label>
          </div>
          <div className="notice" style={{ marginTop: 16 }}>
            <Info size={17} />
            <span>
              Custos internos nunca aparecem no orçamento entregue ao cliente.
            </span>
          </div>
        </div>

        <div className="form-actions">
          {query.visit ? (
            <input type="hidden" name="origin_visit_id" value={query.visit} />
          ) : null}
          {demo ? (
            <span className="notice">Conecte o Supabase para criar serviços.</span>
          ) : null}
          <SubmitButton disabled={demo}>Criar orçamento</SubmitButton>
        </div>
      </form>
    </>
  );
}
