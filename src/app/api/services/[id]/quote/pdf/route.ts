import { getCompanySettings, getService } from "@/lib/data";
import { QuoteValidationError } from "@/lib/quote/calculations";
import { renderSegvisionQuotePdf } from "@/lib/quote/segvisiom-pdf";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  let userId: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Acesso nao autorizado.", { status: 401 });
    userId = user.id;
  }

  const [service, company] = await Promise.all([
    getService(id),
    getCompanySettings(),
  ]);
  if (!service) return new Response("Serviço não encontrado.", { status: 404 });

  let output: Buffer;
  try {
    output = await renderSegvisionQuotePdf(service, company);
  } catch (error) {
    if (error instanceof QuoteValidationError) {
      return new Response(error.message, { status: 422 });
    }
    throw error;
  }
  const fileName = `${service.quote_number ?? "orcamento"}-v${service.quote_version ?? 1}-${slug(service.clients?.name ?? service.title)}.pdf`;

  if (supabase) {
    const storagePath = `${service.id}/${Date.now()}-${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(storagePath, output, {
        contentType: "application/pdf",
      });
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
      .from("generated_documents")
      .insert({
        service_id: service.id,
        name: fileName,
        storage_path: storagePath,
        created_by: userId,
        quote_number: service.quote_number,
        quote_version: service.quote_version ?? 1,
        total_amount:
          Number(service.total_final) ||
          Number(service.sale_amount) +
            Number(service.additional_amount ?? 0) -
            Number(service.discount_amount ?? 0),
        service_status: service.status,
      });
    if (insertError) throw insertError;
  }

  return new Response(new Uint8Array(output), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
