import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createQuickVisit, createVisit } from "@/lib/actions";
import { getActiveProfiles, getClients, isDemoMode } from "@/lib/data";

export const metadata = { title: "Nova visita" };

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ quick?: string; client?: string }>;
}) {
  const query = await searchParams;
  const quick = query.quick === "1";
  const [clients, profiles] = await Promise.all([
    getClients(),
    getActiveProfiles(),
  ]);
  const demo = isDemoMode();

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title={quick ? "Cadastro relâmpago" : "Nova visita"}
        description={
          quick
            ? "Preencha apenas o essencial. O restante pode ser completado depois."
            : "Agende a visita com cliente, período e orientações para a equipe."
        }
        action={
          <Link className="button button-secondary" href="/visits">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        }
      />

      {quick ? (
        <form className="card form-card" action={createQuickVisit}>
          <div className="form-section">
            <h2>
              <Zap size={19} /> Dados essenciais
            </h2>
            <p>Se o telefone ou nome já existir, o cliente será reutilizado.</p>
            <div className="form-grid">
              <label className="field">
                Nome do cliente
                <input name="client_name" required minLength={2} disabled={demo} />
              </label>
              <label className="field">
                Telefone / WhatsApp
                <input name="phone" type="tel" disabled={demo} />
              </label>
              <label className="field field-full">
                Endereço da visita
                <input name="address" required disabled={demo} />
              </label>
              <label className="field">
                Data
                <input name="date" type="date" required disabled={demo} />
              </label>
              <label className="field">
                Hora
                <input name="time" type="time" defaultValue="09:00" required disabled={demo} />
              </label>
              <label className="field">
                Duração em minutos
                <input name="duration" type="number" min="30" step="30" defaultValue="60" disabled={demo} />
              </label>
              <label className="field">
                Prioridade
                <select name="priority" defaultValue="MEDIA" disabled={demo}>
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </label>
              <label className="field field-full">
                Observação curta
                <textarea name="description" disabled={demo} />
              </label>
            </div>
          </div>
          <div className="form-actions">
            <SubmitButton disabled={demo}>Agendar visita</SubmitButton>
          </div>
        </form>
      ) : (
        <form className="card form-card" action={createVisit}>
          <div className="form-section">
            <h2>Cliente e agenda</h2>
            <p>Os campos de cliente, título e período são obrigatórios.</p>
            <div className="form-grid">
              <label className="field">
                Cliente
                <select name="client_id" defaultValue={query.client ?? ""} required disabled={demo}>
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Status inicial
                <select name="status" defaultValue="AGENDADA" disabled={demo}>
                  <option value="AGENDADA">Agendada</option>
                  <option value="CONFIRMADA">Confirmada</option>
                </select>
              </label>
              <label className="field field-full">
                Título
                <input name="title" required placeholder="Ex.: Levantamento para instalação de câmeras" disabled={demo} />
              </label>
              <label className="field">
                Início
                <input name="scheduled_start_at" type="datetime-local" required disabled={demo} />
              </label>
              <label className="field">
                Fim
                <input name="scheduled_end_at" type="datetime-local" required disabled={demo} />
              </label>
              <label className="field">
                Prioridade
                <select name="priority" defaultValue="MEDIA" disabled={demo}>
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </label>
              <label className="field">
                Endereço
                <input name="address_snapshot" disabled={demo} />
              </label>
              <div className="field field-full">
                Responsáveis
                <div className="checkbox-grid">
                  {profiles.map((profile) => (
                    <label className="checkbox-card" key={profile.id}>
                      <input
                        type="checkbox"
                        name="assignee_ids"
                        value={profile.id}
                        disabled={demo}
                      />
                      <span>{profile.full_name || "Usuário interno"}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="field field-full">
                O que deve ser avaliado?
                <textarea name="description" disabled={demo} />
              </label>
              <label className="field">
                Orientações internas
                <textarea name="internal_notes" disabled={demo} />
              </label>
              <label className="field">
                Próxima ação esperada
                <textarea name="next_action" disabled={demo} />
              </label>
            </div>
          </div>
          <div className="form-actions">
            <SubmitButton disabled={demo}>Salvar visita</SubmitButton>
          </div>
        </form>
      )}
    </>
  );
}
