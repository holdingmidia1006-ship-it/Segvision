import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { getService } from "@/lib/data";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function templateData(service: NonNullable<Awaited<ReturnType<typeof getService>>>) {
  return {
    cliente_nome: service.clients?.name ?? "",
    cliente_documento: service.clients?.document ?? "",
    cliente_endereco: "",
    servico_titulo: service.title,
    servico_descricao: service.description ?? "",
    servico_valor_total: formatCurrency(service.sale_amount),
    servico_data: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    validade_orcamento: "15 dias",
    observacoes_cliente: service.customer_notes ?? "",
    itens: (service.service_items ?? []).map((item) => ({
      descricao: item.description,
      quantidade: item.quantity,
      unidade: item.unit,
      valor_unitario: formatCurrency(item.unit_price),
      valor_total: formatCurrency(item.total_price),
    })),
  };
}

async function renderBuiltInTemplate(
  service: NonNullable<Awaited<ReturnType<typeof getService>>>,
) {
  const itemRows =
    service.service_items?.length
      ? service.service_items.map(
          (item) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(item.description)],
                }),
                new TableCell({
                  children: [
                    new Paragraph(`${item.quantity} ${item.unit}`),
                  ],
                }),
                new TableCell({
                  children: [new Paragraph(formatCurrency(item.total_price))],
                }),
              ],
            }),
        )
      : [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph(service.description || service.title),
                ],
              }),
              new TableCell({ children: [new Paragraph("1 serviço")] }),
              new TableCell({
                children: [new Paragraph(formatCurrency(service.sale_amount))],
              }),
            ],
          }),
        ];

  const document = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({ text: "PROPOSTA DE SERVIÇO", bold: true }),
            ],
          }),
          new Paragraph(""),
          new Paragraph({
            children: [
              new TextRun({ text: "Cliente: ", bold: true }),
              new TextRun(service.clients?.name ?? ""),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Serviço: ", bold: true }),
              new TextRun(service.title),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Descrição: ", bold: true }),
              new TextRun(service.description ?? ""),
            ],
          }),
          new Paragraph(""),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Item", heading: HeadingLevel.HEADING_3 })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Quantidade", heading: HeadingLevel.HEADING_3 })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Total", heading: HeadingLevel.HEADING_3 })],
                  }),
                ],
              }),
              ...itemRows,
            ],
          }),
          new Paragraph(""),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Valor total: ", bold: true }),
              new TextRun({
                text: formatCurrency(service.sale_amount),
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Validade: ", bold: true }),
              new TextRun("15 dias"),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Observações: ", bold: true }),
              new TextRun(service.customer_notes ?? "Conforme descrição acima."),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) return new Response("Serviço não encontrado.", { status: 404 });

  const supabase = await createServerSupabase();
  let userId: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Acesso não autorizado.", { status: 401 });
    userId = user.id;
  }

  let output: Buffer;
  if (supabase) {
    const { data: template } = await supabase
      .from("document_templates")
      .select("id,storage_path")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (template) {
      const { data: file, error: downloadError } = await supabase.storage
        .from("document-templates")
        .download(template.storage_path);
      if (downloadError) throw downloadError;

      const zip = new PizZip(await file.arrayBuffer());
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      const fullText = doc.getFullText();
      const required = ["{cliente_nome}", "{servico_titulo}", "{servico_valor_total}"];
      const missing = required.filter((placeholder) => !fullText.includes(placeholder));
      if (missing.length) {
        return Response.json(
          {
            error: `O template não contém: ${missing.join(", ")}.`,
          },
          { status: 422 },
        );
      }

      doc.render(templateData(service));
      output = doc.getZip().generate({ type: "nodebuffer" });
    } else {
      output = await renderBuiltInTemplate(service);
    }
  } else {
    output = await renderBuiltInTemplate(service);
  }

  const fileName = `orcamento-${slug(service.title)}.docx`;

  if (supabase) {
    const storagePath = `${service.id}/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(storagePath, output, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
    if (uploadError) throw uploadError;
    const { error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        service_id: service.id,
        name: fileName,
        storage_path: storagePath,
        created_by: userId,
      });
    if (insertError) throw insertError;
  }

  return new Response(new Uint8Array(output), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
