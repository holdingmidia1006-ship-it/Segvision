import { Download, FileText, Info, UploadCloud } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { uploadDocumentTemplate } from "@/lib/actions";
import { getGeneratedDocuments, isDemoMode } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const documents = await getGeneratedDocuments();
  const demo = isDemoMode();
  const query = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Arquivos"
        title="Documentos"
        description="Mantenha o modelo do Word da empresa e os orçamentos gerados em um armazenamento privado."
      />
      {query.template ? (
        <div className="success-message">
          Novo template definido como padrão.
        </div>
      ) : null}

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <h2>Orçamentos gerados</h2>
              <p>Arquivos salvos a partir dos serviços.</p>
            </div>
            <FileText size={19} color="#60758f" />
          </div>
          {documents.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Serviço</th>
                    <th>Gerado em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td className="cell-title">{document.name}</td>
                      <td>{document.services?.title ?? "Serviço"}</td>
                      <td>{formatDate(document.created_at)}</td>
                      <td>
                        {document.signed_url ? (
                          <a
                            className="button button-secondary button-small"
                            href={document.signed_url}
                          >
                            <Download size={14} />
                            Baixar
                          </a>
                        ) : (
                          <Link
                            className="button button-secondary button-small"
                            href={`/services/${document.service_id}`}
                          >
                            Abrir serviço
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nenhum documento gerado"
              description="Abra um serviço e use o botão Gerar orçamento Word."
            />
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <h2>Template padrão</h2>
              <p>Envie o arquivo .docx já preparado com placeholders.</p>
            </div>
            <UploadCloud size={19} color="#60758f" />
          </div>
          <form className="card-body" action={uploadDocumentTemplate}>
            <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <label className="field">
                Nome do modelo
                <input
                  name="name"
                  defaultValue="Modelo de orçamento"
                  disabled={demo}
                />
              </label>
              <label className="field">
                Arquivo Word
                <input
                  name="template"
                  type="file"
                  accept=".docx"
                  required
                  disabled={demo}
                />
              </label>
              <div className="notice">
                <Info size={17} />
                <span>
                  Placeholders: {"{cliente_nome}"}, {"{cliente_documento}"},{" "}
                  {"{servico_titulo}"}, {"{servico_descricao}"},{" "}
                  {"{servico_valor_total}"} e loop {"{#itens}...{/itens}"}.
                </span>
              </div>
              <SubmitButton className="button-full" disabled={demo}>
                Enviar template
              </SubmitButton>
            </div>
          </form>
        </article>
      </section>
    </>
  );
}
