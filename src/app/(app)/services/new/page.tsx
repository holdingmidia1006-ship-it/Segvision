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
  const defaultValidity = new Date();
  defaultValidity.setDate(defaultValidity.getDate() + 10);

  return (
    <>
      <PageHeader
        eyebrow="Passo 3"
        title="Criar orçamento"
        description="Informe o cliente e o primeiro item. O total é calculado automaticamente."
        action={
          <Link className="button button-secondary" href="/services">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      />

      <form className="card form-card" action={createService}>
        <div className="form-section">
          <h2>Dados essenciais</h2>
          <p>Você poderá adicionar outros itens e detalhes depois de salvar.</p>
          <input type="hidden" name="item_unit" value="un" />
          <div className="form-grid">
            <label className="field field-full">
              Título do orçamento
              <input
                name="title"
                required
                placeholder="Ex.: Instalação das câmeras do depósito"
                disabled={demo}
              />
            </label>
            <label className="field field-full">
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
            <label className="field field-full">
              Primeiro item
              <input
                name="item_description"
                placeholder="Ex.: Câmera IP 4MP instalada"
                required
                disabled={demo}
              />
            </label>
            <label className="field">
              Quantidade
              <input
                name="item_quantity"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue="1"
                required
                disabled={demo}
              />
            </label>
            <label className="field">
              Valor unitário
              <input
                name="item_unit_price"
                type="number"
                min="0"
                step="0.01"
                required
                disabled={demo}
              />
            </label>
          </div>
          <div className="notice" style={{ marginTop: 16 }}>
            <Info size={17} />
            <span>
              O total inicial será quantidade × valor unitário. Ajustes manuais
              ficam nas opções comerciais.
            </span>
          </div>
        </div>

        <details className="form-disclosure">
          <summary>
            <span>
              Local e planejamento
              <small>Endereço, tipo, datas e custo previsto</small>
            </span>
          </summary>
          <div className="form-section">
            <div className="form-grid">
              <label className="field">
                Endereço do serviço
                <select name="client_address_id" disabled={demo}>
                  <option value="">Usar endereço principal do cliente</option>
                  {clients.flatMap((client) =>
                    (client.client_addresses ?? []).map((address) => (
                      <option key={address.id} value={address.id}>
                        {client.name}: {address.label} - {address.street}
                      </option>
                    )),
                  )}
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
        </details>

        <details className="form-disclosure">
          <summary>
            <span>
              Condições comerciais
              <small>Desconto, validade, pagamento e garantia do PDF</small>
            </span>
          </summary>
          <div className="form-section">
            <div className="form-grid">
              <label className="field">
                Valor total manual
                <input
                  name="sale_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Deixe vazio para calcular"
                  disabled={demo}
                />
              </label>
              <label className="field">
                Desconto
                <input
                  name="discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  disabled={demo}
                />
              </label>
              <label className="field">
                Acréscimo
                <input
                  name="additional_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  disabled={demo}
                />
              </label>
              <label className="field">
                Validade
                <input
                  name="valid_until"
                  type="date"
                  defaultValue={defaultValidity.toISOString().slice(0, 10)}
                  disabled={demo}
                />
              </label>
              <label className="field">
                Nome da linha de serviços
                <input
                  name="service_line_label"
                  defaultValue="Mão de obra e Serviços"
                  disabled={demo}
                />
              </label>
              <label className="field">
                Forma de pagamento
                <input
                  name="payment_terms"
                  defaultValue="Formas de pagamento a combinar."
                  disabled={demo}
                />
              </label>
              <label className="field">
                Prazo de execução
                <input
                  name="execution_deadline"
                  defaultValue="Prazo de execução a combinar após a aprovação."
                  disabled={demo}
                />
              </label>
              <label className="field field-full">
                Garantia
                <input
                  name="warranty_terms"
                  defaultValue="Garantia dos serviços conforme legislação vigente."
                  disabled={demo}
                />
              </label>
            </div>
          </div>
        </details>

        <details className="form-disclosure">
          <summary>
            <span>
              Equipe e observações
              <small>Informações internas que não são obrigatórias</small>
            </span>
          </summary>
          <div className="form-section">
            <div className="field field-full">
              Equipe prevista
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
            <div className="form-grid" style={{ marginTop: 16 }}>
              <label className="field">
                Observações para o cliente
                <textarea name="customer_notes" disabled={demo} />
              </label>
              <label className="field">
                Observações internas
                <textarea name="internal_notes" disabled={demo} />
              </label>
              <label className="field">
                Custo unitário interno
                <input
                  name="item_unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={demo}
                />
              </label>
            </div>
            <div className="notice" style={{ marginTop: 16 }}>
              <Info size={17} />
              <span>Custos internos nunca aparecem no PDF enviado ao cliente.</span>
            </div>
          </div>
        </details>

        <div className="form-actions">
          {query.visit ? (
            <input type="hidden" name="origin_visit_id" value={query.visit} />
          ) : null}
          {demo ? (
            <span className="notice">Conecte o Supabase para criar orçamentos.</span>
          ) : null}
          <SubmitButton disabled={demo}>Criar orçamento</SubmitButton>
        </div>
      </form>
    </>
  );
}
