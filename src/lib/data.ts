import {
  demoCatalogItems,
  demoClients,
  demoDocuments,
  demoEmployees,
  demoFiscalDocuments,
  demoServices,
  demoServiceTypes,
  demoVisits,
} from "@/lib/demo-data";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  CatalogItem,
  CalendarEvent,
  Client,
  ClientHistoryEvent,
  Employee,
  FiscalDocument,
  GeneratedDocument,
  Service,
  ServiceType,
  Visit,
  VisitMetrics,
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

export async function getActiveProfiles() {
  const supabase = await createServerSupabase();
  if (!supabase) {
    return [
      {
        id: "demo-user",
        role: "ADMIN",
        active: true,
        full_name: "Administrador",
      },
    ] satisfies AccessProfile[];
  }
  const { data } = await supabase
    .from("profiles")
    .select("id,role,active,full_name")
    .eq("active", true)
    .order("full_name");
  return rows<AccessProfile>(data, []);
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

export async function getClient(id: string) {
  if (!isSupabaseConfigured()) {
    return demoClients.find((client) => client.id === id) ?? null;
  }
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("clients")
    .select("*, client_addresses(*)")
    .eq("id", id)
    .single();
  return (data as Client | null) ?? null;
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

export async function getVisits() {
  const supabase = await createServerSupabase();
  if (!supabase) return demoVisits;
  const { data } = await supabase
    .from("visits")
    .select(
      "*, clients(id,name,phone,email), visit_assignees(id,profile_id,role_on_visit,profiles(id,full_name))",
    )
    .order("scheduled_start_at");
  return rows<Visit>(data, []);
}

export async function getVisit(id: string) {
  if (!isSupabaseConfigured()) {
    return demoVisits.find((visit) => visit.id === id) ?? null;
  }
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("visits")
    .select(
      "*, clients(id,name,phone,email), visit_assignees(id,profile_id,role_on_visit,profiles(id,full_name)), visit_attachments(*)",
    )
    .eq("id", id)
    .single();
  if (!data) return null;
  const visit = data as Visit;
  visit.visit_attachments = await Promise.all(
    (visit.visit_attachments ?? []).map(async (attachment) => {
      const { data: signed } = await supabase.storage
        .from("visit-attachments")
        .createSignedUrl(attachment.storage_path, 3600);
      return { ...attachment, signed_url: signed?.signedUrl ?? null };
    }),
  );
  return visit;
}

export async function getCalendarEvents() {
  if (!isSupabaseConfigured()) {
    return [
      ...demoVisits.map(
        (visit): CalendarEvent => ({
          id: visit.id,
          event_type: "VISITA",
          title: visit.title,
          starts_at: visit.scheduled_start_at,
          ends_at: visit.scheduled_end_at,
          status: visit.status,
          client_id: visit.client_id,
          responsible_id: visit.created_by,
          href: `/visits/${visit.id}`,
        }),
      ),
      ...demoServices
        .filter((service) => service.estimated_start_at)
        .map(
          (service): CalendarEvent => ({
            id: service.id,
            event_type: "SERVICO",
            title: service.title,
            starts_at: service.estimated_start_at!,
            ends_at: service.estimated_end_at ?? service.estimated_start_at!,
            status: service.status,
            client_id: service.client_id,
            responsible_id: null,
            href: `/services/${service.id}`,
          }),
        ),
    ];
  }
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("vw_calendar_events")
    .select("*")
    .order("starts_at");
  return rows<CalendarEvent>(data, []);
}

export async function getClientHistory(clientId: string) {
  if (!isSupabaseConfigured()) {
    const visits = demoVisits
      .filter((visit) => visit.client_id === clientId)
      .map(
        (visit): ClientHistoryEvent => ({
          client_id: clientId,
          event_type: "VISITA",
          event_label: "Visita",
          event_date: visit.updated_at,
          status: visit.status,
          source_table: "visits",
          source_id: visit.id,
          headline: visit.title,
          description: visit.description,
          color_token: "blue",
          responsible_id: visit.created_by,
        }),
      );
    const services = demoServices
      .filter((service) => service.client_id === clientId)
      .map(
        (service): ClientHistoryEvent => ({
          client_id: clientId,
          event_type: "SERVICO",
          event_label: "Serviço",
          event_date: service.updated_at,
          status: service.status,
          source_table: "services",
          source_id: service.id,
          headline: service.title,
          description: service.description,
          color_token: "green",
          responsible_id: null,
        }),
      );
    return [...visits, ...services].sort(
      (a, b) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
    );
  }
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("vw_client_history")
    .select("*")
    .eq("client_id", clientId)
    .order("event_date", { ascending: false });
  return rows<ClientHistoryEvent>(data, []);
}

export async function getVisitMetrics() {
  if (!isSupabaseConfigured()) {
    const converted = demoVisits.filter(
      (visit) => visit.status === "CONVERTIDA_ORCAMENTO",
    ).length;
    return {
      total_visits: demoVisits.length,
      scheduled_visits: demoVisits.filter((v) => v.status === "AGENDADA").length,
      completed_visits: demoVisits.filter((v) => v.status === "CONCLUIDA").length,
      converted_visits: converted,
      cancelled_visits: demoVisits.filter((v) => v.status === "CANCELADA").length,
      visit_to_quote_rate: converted ? 50 : 0,
      cancellation_rate: 0,
      average_hours_to_quote: 12,
    } satisfies VisitMetrics;
  }
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("vw_visit_conversion_metrics")
    .select("*")
    .single();
  return (data as VisitMetrics | null) ?? null;
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
