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

async function requireAdminSession() {
  const session = await requireSession();
  const { data: profile, error } = await session.supabase
    .from("profiles")
    .select("role,active")
    .eq("id", session.user.id)
    .single();

  if (error || !profile?.active || profile.role !== "ADMIN") {
    throw new Error("Ação permitida apenas para administradores.");
  }

  return session;
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
  const { supabase, user } = await requireSession();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      ...input,
      record_type: String(formData.get("record_type") ?? "CLIENTE"),
      source: optionalText.parse(formData.get("source")),
      created_by: user.id,
    })
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
        state: String(formData.get("state") ?? "GO").toUpperCase(),
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
  const { supabase } = await requireAdminSession();
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
  const { supabase } = await requireAdminSession();
  const { error } = await supabase.from("employees").insert(input);
  if (error) throw error;
  revalidatePath("/team");
  redirect("/team?created=1");
}

export async function deleteEmployee(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/team");
}

export async function createService(formData: FormData) {
  const itemDescription = requiredText.parse(formData.get("item_description"));
  const quantity = z
    .number()
    .positive()
    .parse(numberValue(formData.get("item_quantity")));
  const unitPrice = z
    .number()
    .nonnegative()
    .parse(numberValue(formData.get("item_unit_price")));
  const manualSaleAmount = numberValue(formData.get("sale_amount"));
  const calculatedSaleAmount = quantity * unitPrice;
  const input = {
    title: requiredText.parse(formData.get("title")),
    client_id: z.string().uuid().parse(formData.get("client_id")),
    client_address_id:
      z.string().uuid().safeParse(formData.get("client_address_id")).data ?? null,
    service_type_id:
      z.string().uuid().safeParse(formData.get("service_type_id")).data ?? null,
    description: optionalText.parse(formData.get("description")),
    customer_notes: optionalText.parse(formData.get("customer_notes")),
    internal_notes: optionalText.parse(formData.get("internal_notes")),
    sale_amount: z
      .number()
      .positive()
      .parse(manualSaleAmount > 0 ? manualSaleAmount : calculatedSaleAmount),
    discount_amount: z
      .number()
      .nonnegative()
      .parse(numberValue(formData.get("discount_amount"))),
    additional_amount: z
      .number()
      .nonnegative()
      .parse(numberValue(formData.get("additional_amount"))),
    service_line_label:
      optionalText.parse(formData.get("service_line_label")) ??
      "Mão de obra e Serviços",
    payment_terms: optionalText.parse(formData.get("payment_terms")),
    execution_deadline: optionalText.parse(formData.get("execution_deadline")),
    warranty_terms: optionalText.parse(formData.get("warranty_terms")),
    valid_until: String(formData.get("valid_until") ?? "") || null,
    estimated_cost_amount: numberValue(formData.get("estimated_cost_amount")),
    estimated_start_at:
      String(formData.get("estimated_start_at") ?? "") || null,
    estimated_end_at: String(formData.get("estimated_end_at") ?? "") || null,
    origin_visit_id:
      z.string().uuid().safeParse(formData.get("origin_visit_id")).data ?? null,
  };
  const { supabase, user } = await requireSession();
  if (input.discount_amount > input.sale_amount + input.additional_amount) {
    throw new Error(
      "O desconto não pode superar o valor de venda somado ao acréscimo.",
    );
  }
  if (!input.client_address_id) {
    const { data: primaryAddress, error: primaryAddressError } = await supabase
      .from("client_addresses")
      .select("id")
      .eq("client_id", input.client_id)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (primaryAddressError) throw primaryAddressError;
    input.client_address_id = primaryAddress?.id ?? null;
  } else {
    const { data: address, error: addressError } = await supabase
      .from("client_addresses")
      .select("id")
      .eq("id", input.client_address_id)
      .eq("client_id", input.client_id)
      .maybeSingle();
    if (addressError) throw addressError;
    if (!address) {
      throw new Error("O endereço selecionado não pertence ao cliente.");
    }
  }
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

  const { error: itemError } = await supabase.from("service_items").insert({
    service_id: service.id,
    description: itemDescription,
    unit: String(formData.get("item_unit") ?? "un"),
    quantity,
    unit_price: unitPrice,
    unit_cost: z
      .number()
      .nonnegative()
      .parse(numberValue(formData.get("item_unit_cost"))),
    total_price: quantity * unitPrice,
  });
  if (itemError) throw itemError;

  revalidatePath("/services");
  revalidatePath("/dashboard");
  redirect(`/services/${service.id}?created=1`);
}

function visitDateTime(date: FormDataEntryValue | null, time: FormDataEntryValue | null) {
  const value = `${String(date ?? "")}T${String(time ?? "09:00")}:00-03:00`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Data da visita inválida.");
  return parsed;
}

function zonedDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(text) ? text : `${text}:00-03:00`);
}

export async function createQuickVisit(formData: FormData) {
  const { supabase, user } = await requireSession();
  const name = requiredText.parse(formData.get("client_name"));
  const phone = optionalText.parse(formData.get("phone"));
  const address = requiredText.parse(formData.get("address"));
  const start = visitDateTime(formData.get("date"), formData.get("time"));
  const duration = Math.max(30, numberValue(formData.get("duration")) || 60);
  const end = new Date(start.getTime() + duration * 60000);

  let clientId = z.string().uuid().safeParse(formData.get("client_id")).data;
  if (!clientId) {
    let query = supabase.from("clients").select("id").limit(1);
    query = phone ? query.eq("phone", phone) : query.ilike("name", name);
    const { data: existing } = await query.maybeSingle();
    clientId = existing?.id;
  }
  if (!clientId) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name,
        phone,
        person_type: "PF",
        record_type: "LEAD",
        source: "Visita rápida",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (clientError) throw clientError;
    clientId = client.id;
  }

  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      client_id: clientId,
      title:
        optionalText.parse(formData.get("title")) ??
        `Visita para ${name}`,
      status: "AGENDADA",
      priority: z
        .enum(["BAIXA", "MEDIA", "ALTA"])
        .catch("MEDIA")
        .parse(formData.get("priority")),
      scheduled_start_at: start.toISOString(),
      scheduled_end_at: end.toISOString(),
      address_snapshot: address,
      description: optionalText.parse(formData.get("description")),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/visits/${visit.id}?created=1`);
}

export async function createVisit(formData: FormData) {
  const { supabase, user } = await requireSession();
  requiredText.parse(formData.get("scheduled_start_at"));
  requiredText.parse(formData.get("scheduled_end_at"));
  const start = zonedDateTime(formData.get("scheduled_start_at"));
  const end = zonedDateTime(formData.get("scheduled_end_at"));
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  let clientAddressId =
    z.string().uuid().safeParse(formData.get("client_address_id")).data ?? null;
  let addressSnapshot = optionalText.parse(formData.get("address_snapshot"));

  if (!addressSnapshot || !clientAddressId) {
    let addressQuery = supabase
      .from("client_addresses")
      .select("id,street,number,complement,district,city,state,postal_code")
      .eq("client_id", clientId);
    addressQuery = clientAddressId
      ? addressQuery.eq("id", clientAddressId)
      : addressQuery.order("is_primary", { ascending: false }).limit(1);
    const { data: address, error: addressError } =
      await addressQuery.maybeSingle();
    if (addressError) throw addressError;
    if (address) {
      clientAddressId = address.id;
      addressSnapshot ??= [
        address.street,
        address.number,
        address.complement,
        address.district,
        `${address.city}/${address.state}`,
        address.postal_code,
      ]
        .filter(Boolean)
        .join(", ");
    }
  }

  const { data: visit, error } = await supabase
    .from("visits")
    .insert({
      client_id: clientId,
      client_address_id: clientAddressId,
      title: requiredText.parse(formData.get("title")),
      status: z
        .enum(["AGENDADA", "CONFIRMADA"])
        .catch("AGENDADA")
        .parse(formData.get("status")),
      priority: z
        .enum(["BAIXA", "MEDIA", "ALTA"])
        .catch("MEDIA")
        .parse(formData.get("priority")),
      scheduled_start_at: start.toISOString(),
      scheduled_end_at: end.toISOString(),
      address_snapshot: addressSnapshot,
      description: optionalText.parse(formData.get("description")),
      internal_notes: optionalText.parse(formData.get("internal_notes")),
      next_action: optionalText.parse(formData.get("next_action")),
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  const assigneeIds = formData
    .getAll("assignee_ids")
    .map(String)
    .filter((profileId) => profileId && profileId !== user.id);
  if (assigneeIds.length) {
    const { error: assigneeError } = await supabase
      .from("visit_assignees")
      .insert(
        assigneeIds.map((profileId) => ({
          visit_id: visit.id,
          profile_id: profileId,
          role_on_visit: "TECNICO",
        })),
      );
    if (assigneeError) throw assigneeError;
  }
  revalidatePath("/visits");
  revalidatePath("/dashboard");
  redirect(`/visits/${visit.id}?created=1`);
}

export async function updateVisit(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z
    .enum([
      "AGENDADA",
      "CONFIRMADA",
      "CONCLUIDA",
      "CONVERTIDA_ORCAMENTO",
      "CANCELADA",
    ])
    .parse(formData.get("status"));
  const { supabase } = await requireSession();
  const update: Record<string, unknown> = {
    title: requiredText.parse(formData.get("title")),
    status,
    priority: z
      .enum(["BAIXA", "MEDIA", "ALTA"])
      .parse(formData.get("priority")),
    address_snapshot: optionalText.parse(formData.get("address_snapshot")),
    description: optionalText.parse(formData.get("description")),
    outcome_summary: optionalText.parse(formData.get("outcome_summary")),
    next_action: optionalText.parse(formData.get("next_action")),
    internal_notes: optionalText.parse(formData.get("internal_notes")),
  };
  const start = String(formData.get("scheduled_start_at") ?? "");
  const end = String(formData.get("scheduled_end_at") ?? "");
  if (start) update.scheduled_start_at = zonedDateTime(start).toISOString();
  if (end) update.scheduled_end_at = zonedDateTime(end).toISOString();
  const { error } = await supabase.from("visits").update(update).eq("id", id);
  if (error) throw error;
  revalidatePath(`/visits/${id}`);
  revalidatePath("/visits");
  revalidatePath("/dashboard");
  redirect(`/visits/${id}?saved=1`);
}

export async function convertVisitToService(formData: FormData) {
  const visitId = z.string().uuid().parse(formData.get("visit_id"));
  const { supabase, user } = await requireSession();
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id,client_id,title,description,internal_notes,scheduled_start_at,converted_service_id")
    .eq("id", visitId)
    .single();
  if (visitError) throw visitError;
  if (visit.converted_service_id) redirect(`/services/${visit.converted_service_id}`);

  const { data: service, error } = await supabase
    .from("services")
    .insert({
      client_id: visit.client_id,
      title: `Orçamento - ${visit.title}`,
      description: visit.description,
      internal_notes: visit.internal_notes,
      estimated_start_at: visit.scheduled_start_at,
      status: "ORCAMENTO",
      origin_visit_id: visit.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: updateError } = await supabase
    .from("visits")
    .update({
      status: "CONVERTIDA_ORCAMENTO",
      converted_service_id: service.id,
    })
    .eq("id", visit.id);
  if (updateError) throw updateError;
  revalidatePath("/visits");
  revalidatePath("/services");
  revalidatePath("/dashboard");
  redirect(`/services/${service.id}?created=1`);
}

export async function addClientNote(formData: FormData) {
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  const visitId =
    z.string().uuid().safeParse(formData.get("visit_id")).data ?? null;
  const { supabase, user } = await requireSession();
  const { error } = await supabase.from("client_notes").insert({
    client_id: clientId,
    visit_id: visitId,
    note_type: z
      .enum(["MANUAL", "COMERCIAL", "TECNICA"])
      .catch("MANUAL")
      .parse(formData.get("note_type")),
    content: requiredText.parse(formData.get("content")),
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath(`/clients/${clientId}`);
  if (visitId) redirect(`/visits/${visitId}?note=1`);
  redirect(`/clients/${clientId}?note=1`);
}

export async function uploadVisitAttachment(formData: FormData) {
  const visitId = z.string().uuid().parse(formData.get("visit_id"));
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  const file = formData.get("attachment");
  if (!(file instanceof File) || !file.size) throw new Error("Selecione um arquivo.");
  const { supabase, user } = await requireSession();
  const path = `${visitId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("visit-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("visit_attachments").insert({
    visit_id: visitId,
    client_id: clientId,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    uploaded_by: user.id,
  });
  if (error) throw error;
  revalidatePath(`/visits/${visitId}`);
  redirect(`/visits/${visitId}?attachment=1`);
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
  redirect(`/services/${id}?saved=1`);
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
    visible_to_customer: formData.get("visible_to_customer") === "on",
  };
  const { supabase, user } = await requireSession();
  const { error } = await supabase
    .from("service_costs")
    .insert({ ...input, created_by: user.id });
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/dashboard");
  redirect(`/services/${serviceId}?cost=1`);
}

export async function addServiceItem(formData: FormData) {
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const quantity = z
    .number()
    .positive()
    .parse(numberValue(formData.get("quantity")));
  const unitPrice = z
    .number()
    .nonnegative()
    .parse(numberValue(formData.get("unit_price")));
  const { supabase } = await requireSession();
  const { data: lastItem } = await supabase
    .from("service_items")
    .select("position")
    .eq("service_id", serviceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("service_items").insert({
    service_id: serviceId,
    description: requiredText.parse(formData.get("description")),
    unit: optionalText.parse(formData.get("unit")) ?? "un",
    quantity,
    unit_price: unitPrice,
    unit_cost: z
      .number()
      .nonnegative()
      .parse(numberValue(formData.get("unit_cost"))),
    total_price: quantity * unitPrice,
    position: Number(lastItem?.position ?? -1) + 1,
  });
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  redirect(`/services/${serviceId}?item=1`);
}

export async function updateServiceCommercialTerms(formData: FormData) {
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const saleAmount = z
    .number()
    .positive()
    .parse(numberValue(formData.get("sale_amount")));
  const discountAmount = z
    .number()
    .nonnegative()
    .parse(numberValue(formData.get("discount_amount")));
  const additionalAmount = z
    .number()
    .nonnegative()
    .parse(numberValue(formData.get("additional_amount")));
  if (discountAmount > saleAmount + additionalAmount) {
    throw new Error(
      "O desconto não pode superar o valor de venda somado ao acréscimo.",
    );
  }
  const { supabase } = await requireSession();
  const { data: currentService, error: currentServiceError } = await supabase
    .from("services")
    .select("quote_version")
    .eq("id", serviceId)
    .single();
  if (currentServiceError) throw currentServiceError;
  const { error } = await supabase
    .from("services")
    .update({
      sale_amount: saleAmount,
      discount_amount: discountAmount,
      additional_amount: additionalAmount,
      service_line_label:
        optionalText.parse(formData.get("service_line_label")) ??
        "Mão de obra e Serviços",
      payment_terms: optionalText.parse(formData.get("payment_terms")),
      execution_deadline: optionalText.parse(formData.get("execution_deadline")),
      warranty_terms: optionalText.parse(formData.get("warranty_terms")),
      valid_until: String(formData.get("valid_until") ?? "") || null,
      quote_version: Number(currentService.quote_version ?? 1) + 1,
    })
    .eq("id", serviceId);
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  redirect(`/services/${serviceId}?saved=1`);
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

  const { supabase, user } = await requireAdminSession();
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
  const { supabase } = await requireAdminSession();
  const { error } = await supabase.from("service_types").insert({
    name: requiredText.parse(formData.get("name")),
    description: optionalText.parse(formData.get("description")),
  });
  if (error) throw error;
  revalidatePath("/settings");
  redirect("/settings?created=1");
}

export async function createCatalogItem(formData: FormData) {
  const { supabase } = await requireAdminSession();
  const { error } = await supabase.from("catalog_items").insert({
    name: requiredText.parse(formData.get("name")),
    unit: String(formData.get("unit") ?? "un"),
    sale_price: numberValue(formData.get("sale_price")),
    standard_cost: numberValue(formData.get("standard_cost")),
  });
  if (error) throw error;
  revalidatePath("/settings");
  redirect("/settings?created=1");
}

export async function updateClient(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const input = z
    .object({
      name: requiredText,
      person_type: z.enum(["PF", "PJ"]),
      document: optionalText,
      phone: optionalText,
      email: z
        .union([z.literal(""), z.string().email()])
        .transform((value) => value || null),
      notes: optionalText,
      record_type: z.enum(["LEAD", "CLIENTE"]),
    })
    .parse(Object.fromEntries(formData));
  const { supabase } = await requireSession();
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}?saved=1`);
}

function clientAddressInput(formData: FormData) {
  return {
    label: requiredText.parse(formData.get("label")),
    street: requiredText.parse(formData.get("street")),
    number: optionalText.parse(formData.get("number")),
    complement: optionalText.parse(formData.get("complement")),
    district: optionalText.parse(formData.get("district")),
    city: requiredText.parse(formData.get("city")),
    state: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .parse(formData.get("state")),
    postal_code: optionalText.parse(formData.get("postal_code")),
  };
}

export async function addClientAddress(formData: FormData) {
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  const { supabase } = await requireSession();
  const { count, error: countError } = await supabase
    .from("client_addresses")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (countError) throw countError;
  const isPrimary = formData.get("is_primary") === "on" || count === 0;
  const { data: address, error } = await supabase
    .from("client_addresses")
    .insert({
      client_id: clientId,
      ...clientAddressInput(formData),
      is_primary: isPrimary,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (isPrimary) {
    const { error: resetError } = await supabase
      .from("client_addresses")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .neq("id", address.id);
    if (resetError) throw resetError;
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?address=1`);
}

export async function updateClientAddress(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  const { supabase } = await requireSession();
  const isPrimary = formData.get("is_primary") === "on";
  const { error } = await supabase
    .from("client_addresses")
    .update({ ...clientAddressInput(formData), is_primary: isPrimary })
    .eq("id", id)
    .eq("client_id", clientId);
  if (error) throw error;
  if (isPrimary) {
    const { error: resetError } = await supabase
      .from("client_addresses")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .neq("id", id);
    if (resetError) throw resetError;
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?address=1`);
}

export async function deleteClientAddress(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const clientId = z.string().uuid().parse(formData.get("client_id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase
    .from("client_addresses")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);
  if (error) throw error;
  const { data: firstAddress, error: addressError } = await supabase
    .from("client_addresses")
    .select("id")
    .eq("client_id", clientId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (addressError) throw addressError;
  if (firstAddress) {
    const { error: primaryError } = await supabase
      .from("client_addresses")
      .update({ is_primary: true })
      .eq("id", firstAddress.id);
    if (primaryError) throw primaryError;
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?address=1`);
}

export async function updateEmployee(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase
    .from("employees")
    .update({
      name: requiredText.parse(formData.get("name")),
      document: optionalText.parse(formData.get("document")),
      phone: optionalText.parse(formData.get("phone")),
      daily_rate: z.number().nonnegative().parse(numberValue(formData.get("daily_rate"))),
      half_daily_rate: z
        .number()
        .nonnegative()
        .parse(numberValue(formData.get("half_daily_rate"))),
      default_bonus: z
        .number()
        .nonnegative()
        .parse(numberValue(formData.get("default_bonus"))),
      notes: optionalText.parse(formData.get("notes")),
      active: formData.get("active") === "on",
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/team");
  redirect("/team?updated=1");
}

export async function updateServiceDetails(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("services")
    .update({
      title: requiredText.parse(formData.get("title")),
      description: optionalText.parse(formData.get("description")),
      customer_notes: optionalText.parse(formData.get("customer_notes")),
      internal_notes: optionalText.parse(formData.get("internal_notes")),
      estimated_start_at: String(formData.get("estimated_start_at") ?? "") || null,
      estimated_end_at: String(formData.get("estimated_end_at") ?? "") || null,
      estimated_cost_amount: z
        .number()
        .nonnegative()
        .parse(numberValue(formData.get("estimated_cost_amount"))),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/services/${id}`);
  revalidatePath("/services");
  revalidatePath("/dashboard");
  redirect(`/services/${id}?saved=1`);
}

export async function updateServiceItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const quantity = z.number().positive().parse(numberValue(formData.get("quantity")));
  const unitPrice = z.number().nonnegative().parse(numberValue(formData.get("unit_price")));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("service_items")
    .update({
      description: requiredText.parse(formData.get("description")),
      unit: optionalText.parse(formData.get("unit")) ?? "un",
      quantity,
      unit_price: unitPrice,
      unit_cost: z.number().nonnegative().parse(numberValue(formData.get("unit_cost"))),
      total_price: quantity * unitPrice,
    })
    .eq("id", id)
    .eq("service_id", serviceId);
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  redirect(`/services/${serviceId}?item=1`);
}

export async function deleteServiceItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("service_items")
    .delete()
    .eq("id", id)
    .eq("service_id", serviceId);
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  redirect(`/services/${serviceId}?item=1`);
}

export async function updateServiceCost(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("service_costs")
    .update({
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
      cost_date: String(formData.get("cost_date") ?? ""),
      visible_to_customer: formData.get("visible_to_customer") === "on",
    })
    .eq("id", id)
    .eq("service_id", serviceId);
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/dashboard");
  redirect(`/services/${serviceId}?cost=1`);
}

export async function deleteServiceCost(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("service_costs")
    .delete()
    .eq("id", id)
    .eq("service_id", serviceId);
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/dashboard");
  redirect(`/services/${serviceId}?cost=1`);
}

export async function addServiceEmployee(formData: FormData) {
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const employeeId = z.string().uuid().parse(formData.get("employee_id"));
  const { supabase } = await requireSession();
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id,daily_rate,half_daily_rate,default_bonus")
    .eq("id", employeeId)
    .single();
  if (employeeError) throw employeeError;
  const { error } = await supabase.from("service_employees").insert({
    service_id: serviceId,
    employee_id: employee.id,
    daily_rate_snapshot: employee.daily_rate,
    half_daily_rate_snapshot: employee.half_daily_rate,
    bonus_snapshot: employee.default_bonus,
  });
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  redirect(`/services/${serviceId}?team=1`);
}

export async function removeServiceEmployee(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const serviceId = z.string().uuid().parse(formData.get("service_id"));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("service_employees")
    .delete()
    .eq("id", id)
    .eq("service_id", serviceId);
  if (error) throw error;
  revalidatePath(`/services/${serviceId}`);
  redirect(`/services/${serviceId}?team=1`);
}

export async function deleteVisit(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { data: attachments, error: attachmentError } = await supabase
    .from("visit_attachments")
    .select("storage_path")
    .eq("visit_id", id);
  if (attachmentError) throw attachmentError;
  const { error } = await supabase.from("visits").delete().eq("id", id);
  if (error) throw error;
  const paths = (attachments ?? []).map((attachment) => attachment.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from("visit-attachments")
      .remove(paths);
    if (storageError) throw storageError;
  }
  revalidatePath("/visits");
  revalidatePath("/dashboard");
  redirect("/visits?deleted=1");
}

export async function deleteVisitAttachment(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const visitId = z.string().uuid().parse(formData.get("visit_id"));
  const { supabase } = await requireSession();
  const { data: attachment, error: attachmentError } = await supabase
    .from("visit_attachments")
    .select("storage_path")
    .eq("id", id)
    .eq("visit_id", visitId)
    .single();
  if (attachmentError) throw attachmentError;
  const { error: storageError } = await supabase.storage
    .from("visit-attachments")
    .remove([attachment.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase
    .from("visit_attachments")
    .delete()
    .eq("id", id)
    .eq("visit_id", visitId);
  if (error) throw error;
  revalidatePath(`/visits/${visitId}`);
  redirect(`/visits/${visitId}?attachment=1`);
}

export async function updateFiscalDocument(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { error } = await supabase
    .from("fiscal_documents")
    .update({
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
      number: optionalText.parse(formData.get("number")),
      series: optionalText.parse(formData.get("series")),
      access_key: optionalText.parse(formData.get("access_key")),
      consultation_url: optionalText.parse(formData.get("consultation_url")),
      notes: optionalText.parse(formData.get("notes")),
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
  redirect("/invoices?updated=1");
}

export async function deleteFiscalDocument(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { data: document, error: documentError } = await supabase
    .from("fiscal_documents")
    .select("xml_path,pdf_path")
    .eq("id", id)
    .single();
  if (documentError) throw documentError;
  const paths = [document.xml_path, document.pdf_path].filter(
    (path): path is string => Boolean(path),
  );
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from("service-attachments")
      .remove(paths);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("fiscal_documents").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/invoices");
  redirect("/invoices?deleted=1");
}

export async function updateServiceType(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase
    .from("service_types")
    .update({
      name: requiredText.parse(formData.get("name")),
      description: optionalText.parse(formData.get("description")),
      active: formData.get("active") === "on",
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function deleteServiceType(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase.from("service_types").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  redirect("/settings?deleted=1");
}

export async function updateCatalogItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase
    .from("catalog_items")
    .update({
      name: requiredText.parse(formData.get("name")),
      unit: requiredText.parse(formData.get("unit")),
      sale_price: z.number().nonnegative().parse(numberValue(formData.get("sale_price"))),
      standard_cost: z
        .number()
        .nonnegative()
        .parse(numberValue(formData.get("standard_cost"))),
      active: formData.get("active") === "on",
    })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function deleteCatalogItem(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireAdminSession();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/settings");
  redirect("/settings?deleted=1");
}

export async function updateCompanySettings(formData: FormData) {
  const { supabase } = await requireAdminSession();
  const { error } = await supabase
    .from("company_settings")
    .update({
      legal_name: requiredText.parse(formData.get("legal_name")),
      trade_name: requiredText.parse(formData.get("trade_name")),
      document: requiredText.parse(formData.get("document")),
      phone: optionalText.parse(formData.get("phone")),
      email: z
        .union([z.literal(""), z.string().email()])
        .transform((value) => value || null)
        .parse(String(formData.get("email") ?? "")),
      instagram: optionalText.parse(formData.get("instagram")),
      street: optionalText.parse(formData.get("street")),
      number: optionalText.parse(formData.get("number")),
      complement: optionalText.parse(formData.get("complement")),
      district: optionalText.parse(formData.get("district")),
      city: requiredText.parse(formData.get("city")),
      state: z.string().trim().length(2).parse(formData.get("state")).toUpperCase(),
      postal_code: optionalText.parse(formData.get("postal_code")),
      responsible_name: optionalText.parse(formData.get("responsible_name")),
      responsible_role: optionalText.parse(formData.get("responsible_role")),
      default_validity_days: z
        .number()
        .int()
        .positive()
        .parse(numberValue(formData.get("default_validity_days"))),
      default_payment_terms: optionalText.parse(formData.get("default_payment_terms")),
      default_execution_deadline: optionalText.parse(
        formData.get("default_execution_deadline"),
      ),
      default_warranty_terms: optionalText.parse(formData.get("default_warranty_terms")),
    })
    .eq("id", true);
  if (error) throw error;
  revalidatePath("/settings");
  revalidatePath("/services");
  redirect("/settings?saved=1");
}

export async function deleteGeneratedDocument(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const { supabase } = await requireSession();
  const { data: document, error: documentError } = await supabase
    .from("generated_documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (documentError) throw documentError;
  const { error } = await supabase
    .from("generated_documents")
    .delete()
    .eq("id", id);
  if (error) throw error;
  const { error: storageError } = await supabase.storage
    .from("generated-documents")
    .remove([document.storage_path]);
  if (storageError) throw storageError;
  revalidatePath("/documents");
  redirect("/documents?deleted=1");
}
