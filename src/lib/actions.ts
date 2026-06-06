"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import type { ServiceStatus } from "@/lib/types";

const requiredText = z.string().trim().min(2);
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || null);

function numberValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

async function requireSession() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    throw new Error("Ação indisponível no modo demonstração.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { supabase, user };
}

export async function signOut() {
  const supabase = await createServerSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}

export async function createClient(formData: FormData) {
  const schema = z.object({
    name: requiredText,
    person_type: z.enum(["PF", "PJ"]),
    document: optionalText,
    phone: optionalText,
    email: z.union([z.literal(""), z.string().email()]).transform((v) => v || null),
    notes: optionalText,
  });
  const input = schema.parse(Object.fromEntries(formData));
  const { supabase } = await requireSession();

  const { data: client, error } = await supabase
    .from("clients")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;

  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (street && city) {
    const { error: addressError } = await supabase
      .from("client_addresses")
      .insert({
        client_id: client.id,
        label: String(formData.get("address_label") ?? "Principal"),
        street,
        number: String(formData.get("number") ?? "") || null,
        complement: String(formData.get("complement") ?? "") || null,
        district: String(formData.get("district") ?? "") || null,
        city,
        state: String(formData.get("state") ?? "SP").toUpperCase(),
        postal_code: String(formData.get("postal_code") ?? "") || null,
        is_primary: true,
      });
    if (addressError) throw addressError;
  }

  revalidatePath("/clients");
  redirect("/clients?created=1");
}

export async function deleteClient(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/clients");
}

export async function createEmployee(formData: FormData) {
  const input = {
    name: requiredText.parse(formData.get("name")),
    document: optionalText.parse(formData.get("document")),
    phone: optionalText.parse(formData.get("phone")),
    daily_rate: numberValue(formData.get("daily_rate")),
    half_daily_rate: numberValue(formData.get("half_daily_rate")),
    default_bonus: numberValue(formData.get("default_bonus")),
    notes: optionalText.parse(formData.get("notes")),
  };
  const { supabase } = await requireSession();
  const { error } = await supabase.from("employees").insert(input);
  if (error) throw error;
  revalidatePath("/team");
  redirect("/team?created=1");
}

export async function deleteEmployee(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/team");
}

export async function createService(formData: FormData) {
  const input = {
    title: requiredText.parse(formData.get("title")),
    client_id: z.string().uuid().parse(formData.get("client_id")),
    service_type_id:
      z.string().uuid().safeParse(formData.get("service_type_id")).data ?? null,
    description: optionalText.parse(formData.get("description")),
    customer_notes: optionalText.parse(formData.get("customer_notes")),
    internal_notes: optionalText.parse(formData.get("internal_notes")),
    sale_amount: numberValue(formData.get("sale_amount")),
    estimated_cost_amount: numberValue(formData.get("estimated_cost_amount")),
    estimated_start_at:
      String(formData.get("estimated_start_at") ?? "") || null,
    estimated_end_at: String(formData.get("estimated_end_at") ?? "") || null,
  };
  const { supabase, user } = await requireSession();
  const { data: service, error } = await supabase
    .from("services")
    .insert({ ...input, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;

  const employeeIds = formData
    .getAll("employee_ids")
    .map(String)
    .filter(Boolean);
  if (employeeIds.length) {
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id,daily_rate,half_daily_rate,default_bonus")
      .in("id", employeeIds);
    if (employeesError) throw employeesError;
    const { error: assignmentError } = await supabase
      .from("service_employees")
      .insert(
        (employees ?? []).map((employee) => ({
          service_id: service.id,
          employee_id: employee.id,
          daily_rate_snapshot: employee.daily_rate,
          half_daily_rate_snapshot: employee.half_daily_rate,
          bonus_snapshot: employee.default_bonus,
        })),
      );
    if (assignmentError) throw assignmentError;
  }

  const itemDescription = String(formData.get("item_description") ?? "").trim();
  if (itemDescription) {
    const quantity = numberValue(formData.get("item_quantity")) || 1;
    const unitPrice = numberValue(formData.get("item_unit_price"));
    const { error: itemError } = await supabase.from("service_items").insert({
      service_id: service.id,
      description: itemDescription,
      unit: String(formData.get("item_unit") ?? "un"),
      quantity,
      unit_price: unitPrice,
      unit_cost: numberValue(formData.get("item_unit_cost")),
      total_price: quantity * unitPrice,
    });
    if (itemError) throw itemError;
  }

  revalidatePath("/services");
  revalidatePath("/dashboard");
  redirect(`/services/${service.id}?created=1`);
}

export async function updateServiceStatus(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z
    .enum(["ORCAMENTO", "EM_EXECUCAO", "GARANTIA", "FINALIZADO", "CANCELADO"])
    .parse(formData.get("status")) as ServiceStatus;
  const { supabase } = await requireSession();
  const timestamps: Record<string, string | null> = {};
  if (status === "EM_EXECUCAO") timestamps.actual_start_at = new Date().toISOString();
  if (status === "FINALIZADO") timestamps.actual_end_at = new Date().toISOString();

  const { error } = await supabase
    .from("services")
    .update({ status, ...timestamps })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/services/${id}`);
  revalidatePath("/board");
  revalidatePath("/dashboard");
}

export async function addServiceCost(formData: FormData) {
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const input = {
    service_id: serviceId,
    category: z
      .enum([
        "COMBUSTIVEL",
        "ALMOCO",
        "DIARIA",
        "MEIA_DIARIA",
        "BONIFICACAO",
        "MATERIAL_EXTRA",
        "PEDAGIO",
        "ESTACIONAMENTO",
        "ALUGUEL_EQUIPAMENTO",
        "OUTROS",
      ])
      .parse(formData.get("category")),
    description: optionalText.parse(formData.get("description")),
    amount: z.number().positive().parse(numberValue(formData.get("amount"))),
    cost_date: String(formData.get("cost_date") ?? new Date().toISOString().slice(0, 10)),
  };
  const { supabase, user } = await requireSession();
  const { error } = await supabase
    .from("service_costs")
    .insert({ ...input, created_by: user.id });
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/dashboard");
}

export async function createFiscalDocument(formData: FormData) {
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const { supabase, user } = await requireSession();
  const basePath = `${serviceId}/${crypto.randomUUID()}`;
  let xmlPath: string | null = null;
  let pdfPath: string | null = null;

  for (const [field, extension] of [
    ["xml_file", "xml"],
    ["pdf_file", "pdf"],
  ] as const) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    const path = `${basePath}/${safeFileName(file.name || `documento.${extension}`)}`;
    const { error: uploadError } = await supabase.storage
      .from("service-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    if (field === "xml_file") xmlPath = path;
    if (field === "pdf_file") pdfPath = path;
  }

  const { error } = await supabase.from("fiscal_documents").insert({
    service_id: serviceId,
    document_type: z.enum(["NFSE", "NFE", "OUTRO"]).parse(formData.get("document_type")),
    status: z
      .enum([
        "NAO_EMITIDA",
        "PREPARADA",
        "EMITIDA",
        "CANCELADA",
        "ERRO",
        "AGUARDANDO_CONTABILIDADE",
      ])
      .parse(formData.get("status")),
    amount: numberValue(formData.get("amount")),
    customer_name: requiredText.parse(formData.get("customer_name")),
    fiscal_description: requiredText.parse(formData.get("fiscal_description")),
    number: optionalText.parse(formData.get("number")),
    series: optionalText.parse(formData.get("series")),
    access_key: optionalText.parse(formData.get("access_key")),
    consultation_url: optionalText.parse(formData.get("consultation_url")),
    notes: optionalText.parse(formData.get("notes")),
    xml_path: xmlPath,
    pdf_path: pdfPath,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath("/invoices");
  revalidatePath(`/services/${serviceId}`);
  redirect("/invoices?created=1");
}

export async function uploadDocumentTemplate(formData: FormData) {
  const file = formData.get("template");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo .docx.");
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    throw new Error("O template precisa ser um arquivo .docx.");
  }

  const { supabase, user } = await requireSession();
  const path = `${user.id}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("document-templates")
    .upload(path, file, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  if (uploadError) throw uploadError;

  await supabase
    .from("document_templates")
    .update({ active: false })
    .eq("active", true);
  const { error } = await supabase.from("document_templates").insert({
    name: String(formData.get("name") ?? file.name),
    storage_path: path,
    active: true,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath("/documents");
  redirect("/documents?template=1");
}

export async function createServiceType(formData: FormData) {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("service_types").insert({
    name: requiredText.parse(formData.get("name")),
    description: optionalText.parse(formData.get("description")),
  });
  if (error) throw error;
  revalidatePath("/settings");
}

export async function createCatalogItem(formData: FormData) {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("catalog_items").insert({
    name: requiredText.parse(formData.get("name")),
    unit: String(formData.get("unit") ?? "un"),
    sale_price: numberValue(formData.get("sale_price")),
    standard_cost: numberValue(formData.get("standard_cost")),
  });
  if (error) throw error;
  revalidatePath("/settings");
}
