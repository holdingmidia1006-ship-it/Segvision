import { Layers3 } from "lucide-react";
import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/page-header";
import { getServices } from "@/lib/data";

export const metadata = { title: "Quadro de Serviços" };

export default async function BoardPage() {
  const services = await getServices();

  return (
    <>
      <PageHeader
        eyebrow="Operação visual"
        title="Quadro de Serviços"
        description="Veja rapidamente o que está aguardando resposta, em execução, em garantia ou já encerrado."
        action={
          <Link className="button button-primary" href="/services/new">
            Novo orçamento
          </Link>
        }
      />
      <div className="notice" style={{ marginBottom: 18 }}>
        <Layers3 aria-hidden="true" size={18} />
        <span>
          No celular, escolha uma etapa por vez. Cada cor também é acompanhada
          por texto para não depender apenas da percepção visual.
        </span>
      </div>
      <KanbanBoard services={services} />
    </>
  );
}
