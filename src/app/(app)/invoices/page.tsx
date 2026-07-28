import { FileCheck2, Info, Plus, ReceiptText, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FiscalServiceFields } from "@/components/fiscal-service-fields";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-dialog";
import { Toast } from "@/components/ui/toast";
import {
  createFiscalDocument,
  deleteFiscalDocument,
  updateFiscalDocument,
} from "@/lib/actions";
import {
  getFiscalDocuments,
  getServices,
  isDemoMode,
} from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Notas" };

const fiscalStatus: Record<string, string> = {
  NAO_EMITIDA: "Não emitida",
  PREPARADA: "Preparada",
  EMITIDA: "Emitida",
  CANCELADA: "Cancelada",
  ERRO: "Erro",
  AGUARDANDO_CONTABILIDADE: "Aguardando contabilidade",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    service?: string;
    updated?: string;
  }>;
}) {
  const [documents, services] = await Promise.all([
    getFiscalDocuments(),
    getServices(),
  ]);
  const query = await searchParams;
  const selectedService = services.find(
    (service) => service.id === query.service,
  );
  const demo = isDemoMode();

  return (
    <>
      <PageHeader
        eyebrow="Fiscal assistido"
        title="Notas"
        description="Prepare os dados, registre a emissão feita pela contabilidade e guarde XML e PDF. A emissão automática não está habilitada."
        action={
          <a className="button button-primary" href="#preparar-nota">
            <Plus size={16} />
            Preparar nota
          </a>
        }
      />
      {query.created ? (
        <Toast>Documento fiscal preparado.</Toast>
      ) : null}
      {query.updated ? <Toast>Documento fiscal atualizado.</Toast> : null}
      {query.deleted ? <Toast>Documento fiscal excluído.</Toast> : null}
      <div className="notice notice-warn" style={{ marginBottom: 18 }}>
        <Info size={18} />
        <span>
          Confirme com a contabilidade se a operação exige NFS-e, NF-e ou outro
          tratamento antes da emissão real.
        </span>
      </div>

      <article className="card">
        <div className="card-header">
          <div>
            <h2>Documentos fiscais</h2>
            <p>Controle do que foi preparado, emitido ou ainda depende de ação.</p>
          </div>
          <ReceiptText size={19} color="#60758f" />
        </div>
        {documents.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Serviço e tomador</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td data-label="Serviço e tomador">
                      <span className="cell-title">
                        {document.services?.title ?? "Serviço"}
                      </span>
                      <span className="cell-subtitle">
                        {document.customer_name}
                      </span>
                    </td>
                    <td data-label="Tipo">{document.document_type}</td>
                    <td data-label="Status">
                      <span
                        className={`status-badge ${
                          document.status === "EMITIDA"
                            ? "status-running"
                            : document.status === "ERRO" ||
                                document.status === "CANCELADA"
                              ? "status-finished"
                              : "status-budget"
                        }`}
                      >
                        <FileCheck2 size={13} />
                        {fiscalStatus[document.status]}
                      </span>
                    </td>
                    <td data-label="Valor">{formatCurrency(document.amount)}</td>
                    <td data-label="Data">{formatDate(document.created_at)}</td>
                    <td data-label="Ações">
                      <details className="table-actions">
                        <summary>Gerenciar</summary>
                        <form
                          className="form-grid single-column"
                          action={updateFiscalDocument}
                        >
                          <input type="hidden" name="id" value={document.id} />
                          <label className="field">
                            Status
                            <select
                              name="status"
                              defaultValue={document.status}
                              disabled={demo}
                            >
                              {Object.entries(fiscalStatus).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            Número
                            <input
                              name="number"
                              defaultValue={document.number ?? ""}
                              disabled={demo}
                            />
                          </label>
                          <label className="field">
                            Série
                            <input
                              name="series"
                              defaultValue={document.series ?? ""}
                              disabled={demo}
                            />
                          </label>
                          <label className="field">
                            Chave de acesso
                            <input
                              name="access_key"
                              defaultValue={document.access_key ?? ""}
                              disabled={demo}
                            />
                          </label>
                          <label className="field">
                            Link de consulta
                            <input
                              name="consultation_url"
                              type="url"
                              defaultValue={document.consultation_url ?? ""}
                              disabled={demo}
                            />
                          </label>
                          <label className="field">
                            Observações
                            <textarea
                              name="notes"
                              defaultValue={document.notes ?? ""}
                              disabled={demo}
                            />
                          </label>
                          <SubmitButton disabled={demo}>Salvar nota</SubmitButton>
                        </form>
                        {!demo ? (
                          <form className="record-danger" action={deleteFiscalDocument}>
                            <input type="hidden" name="id" value={document.id} />
                            <ConfirmSubmitButton
                              title="Excluir este documento fiscal?"
                              description="O registro, o XML e o PDF anexados serão removidos. Esta ação não cancela uma nota já emitida no órgão fiscal."
                              confirmLabel="Excluir registro"
                            >
                              <Trash2 aria-hidden="true" size={14} /> Excluir
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhuma nota preparada"
            description="Use o formulário abaixo para registrar o primeiro documento fiscal."
          />
        )}
      </article>

      <form
        id="preparar-nota"
        className="card form-card"
        action={createFiscalDocument}
        style={{ marginTop: 22 }}
      >
        <div className="form-section">
          <h2>Preparar documento fiscal</h2>
          <p>Este registro não transmite dados para prefeitura ou SEFAZ.</p>
          <div className="form-grid">
            <FiscalServiceFields
              demo={demo}
              initialServiceId={selectedService?.id}
              services={services}
            />
            <label className="field">
              Tipo de documento
              <select name="document_type" defaultValue="NFSE" disabled={demo}>
                <option value="NFSE">NFS-e</option>
                <option value="NFE">NF-e</option>
                <option value="OUTRO">Outro</option>
              </select>
            </label>
            <label className="field">
              Status
              <select
                name="status"
                defaultValue="AGUARDANDO_CONTABILIDADE"
                disabled={demo}
              >
                <option value="NAO_EMITIDA">Não emitida</option>
                <option value="PREPARADA">Preparada</option>
                <option value="AGUARDANDO_CONTABILIDADE">
                  Aguardando contabilidade
                </option>
                <option value="EMITIDA">Emitida</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="ERRO">Erro</option>
              </select>
            </label>
            <label className="field field-full">
              Descrição fiscal
              <textarea name="fiscal_description" required disabled={demo} />
            </label>
            <label className="field">
              Número
              <input name="number" disabled={demo} />
            </label>
            <label className="field">
              Série
              <input name="series" disabled={demo} />
            </label>
            <label className="field">
              Chave de acesso
              <input name="access_key" disabled={demo} />
            </label>
            <label className="field">
              Link de consulta
              <input name="consultation_url" type="url" disabled={demo} />
            </label>
            <label className="field">
              XML
              <input name="xml_file" type="file" accept=".xml" disabled={demo} />
            </label>
            <label className="field">
              PDF
              <input
                name="pdf_file"
                type="file"
                accept=".pdf"
                disabled={demo}
              />
            </label>
            <label className="field field-full">
              Observações da contabilidade
              <textarea name="notes" disabled={demo} />
            </label>
          </div>
        </div>
        <div className="form-actions">
          <SubmitButton disabled={demo}>Salvar preparação</SubmitButton>
        </div>
      </form>
    </>
  );
}
