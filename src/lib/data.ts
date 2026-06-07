import {
  demoCatalogItems,
  demoClients,
  demoDocuments,
  demoEmployees,
  demoFiscalDocuments,
  demoServices,
  demoServiceTypes,
} from "@/lib/demo-data";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  CatalogItem,
  Client,
  Employee,
  FiscalDocument,
  GeneratedDocument,
  Service,
  ServiceType,
} from "@/lib/types";

export const isDemoMode = () => !isSupabaseConfigured();

export type AccessProfile = {
  id: string;
  role: "ADMIN" | "OPERADOR";
  active: boolean;
  full_name: string | null;
};

function rows<T>(data: unknown, fallback: T[]): T[] {
  return Array.isArray(data) ? (data as T[]) : fallback;
}

export async function getCurrentProfile() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,role,active,full_name")
    .eq("id", user.id)
    .single();

  return (data as AccessProfile | null) ?? null;
}

export async function getClients() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoClients;

  const { data } = await supabase
    .from("clients")
    .select("*, client_addresses(*)")
    .order("name");

  return rows<Client>(data, []);
}

export async function getEmployees() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoEmployees;

  const { data } = await supabase.from("employees").select("*").order("name");
  return rows<Employee>(data, []);
}

export async function getServiceTypes() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoServiceTypes;

  const { data } = await supabase
    .from("service_types")
    .select("*")
    .order("name");
  return rows<ServiceType>(data, []);
}

export async function getCatalogItems() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoCatalogItems;

  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .order("name");
  return rows<CatalogItem>(data, []);
}

export async function getServices() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoServices;

  const { data } = await supabase
    .from("services")
    .select(
      "*, clients(id,name,phone,document), service_types(id,name), service_costs(*)",
    )
    .order("created_at", { ascending: false });

  return rows<Service>(data, []);
}

export async function getService(id: string) {
  if (!isSupabaseConfigured()) {
    return demoServices.find((service) => service.id === id) ?? null;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("services")
    .select(
      "*, clients(id,name,phone,document), service_types(id,name), service_costs(*), service_items(*), service_employees(*, employees(id,name,phone))",
    )
    .eq("id", id)
    .single();

  return (data as Service | null) ?? null;
}

export async function getFiscalDocuments() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoFiscalDocuments;

  const { data } = await supabase
    .from("fiscal_documents")
    .select("*, services(id,title,clients(id,name))")
    .order("created_at", { ascending: false });
  return rows<FiscalDocument>(data, []);
}

export async function getGeneratedDocuments() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoDocuments;

  const { data } = await supabase
    .from("generated_documents")
    .select("*, services(id,title)")
    .order("created_at", { ascending: false });

  const documents = rows<GeneratedDocument>(data, []);
  return Promise.all(
    documents.map(async (document) => {
      const { data: signed } = await supabase.storage
        .from("generated-documents")
        .createSignedUrl(document.storage_path, 3600);
      return { ...document, signed_url: signed?.signedUrl ?? null };
    }),
  );
}

export async function getDashboardData() {
  const services = await getServices();
  const activeStatuses = new Set(["EM_EXECUCAO", "GARANTIA", "FINALIZADO"]);
  const revenue = services
    .filter((service) => activeStatuses.has(service.status))
    .reduce((sum, service) => sum + Number(service.sale_amount), 0);
  const costs = services.reduce(
    (sum, service) =>
      sum +
      (service.service_costs ?? []).reduce(
        (serviceSum, cost) => serviceSum + Number(cost.amount),
        0,
      ),
    0,
  );
  const completed = services.filter(
    (service) => service.status === "FINALIZADO",
  );
  const durations = completed
    .filter((service) => service.actual_start_at && service.actual_end_at)
    .map(
      (service) =>
        (new Date(service.actual_end_at!).getTime() -
          new Date(service.actual_start_at!).getTime()) /
        86400000,
    );

  return {
    services,
    revenue,
    costs,
    margin: revenue - costs,
    averageDays: durations.length
      ? durations.reduce((sum, days) => sum + days, 0) / durations.length
      : 0,
    counts: {
      ORCAMENTO: services.filter((service) => service.status === "ORCAMENTO")
        .length,
      EM_EXECUCAO: services.filter(
        (service) => service.status === "EM_EXECUCAO",
      ).length,
      GARANTIA: services.filter((service) => service.status === "GARANTIA")
        .length,
      FINALIZADO: completed.length,
    },
  };
}
