import { getService } from "@/lib/data";
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
  const service = await getService(id);
  if (!service) return new Response("Servico nao encontrado.", { status: 404 });

  const supabase = await createServerSupabase();
  let userId: string | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Acesso nao autorizado.", { status: 401 });
    userId = user.id;
  }

  const output = await renderSegvisionQuotePdf(service);
  const fileName = `orcamento-seg-visiom-${slug(service.title)}.pdf`;

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
