export type ServiceStatus =
  | "ORCAMENTO"
  | "EM_EXECUCAO"
  | "GARANTIA"
  | "FINALIZADO"
  | "CANCELADO";

export type ClientAddress = {
  id: string;
  client_id: string;
  label: string;
  street: string;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  is_primary: boolean;
};

export type Client = {
  id: string;
  name: string;
  person_type: "PF" | "PJ";
  document: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  record_type?: "LEAD" | "CLIENTE";
  source?: string | null;
  created_by?: string | null;
  active: boolean;
  created_at: string;
  client_addresses?: ClientAddress[];
};

export type Employee = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  daily_rate: number;
  half_daily_rate: number;
  default_bonus: number;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type ServiceType = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  sale_price: number;
  standard_cost: number;
  active: boolean;
};

export type ServiceCost = {
  id: string;
  service_id: string;
  employee_id: string | null;
  category: string;
  description: string | null;
  amount: number;
  cost_date: string;
  visible_to_customer: boolean;
  created_at: string;
};

export type ServiceItem = {
  id: string;
  service_id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
};

export type ServiceEmployee = {
  id: string;
  service_id: string;
  employee_id: string;
  daily_rate_snapshot: number;
  half_daily_rate_snapshot: number;
  bonus_snapshot: number;
  days_worked: number;
  half_days_worked: number;
  bonus_paid: number;
  employees?: Pick<Employee, "id" | "name" | "phone"> | null;
};

export type Service = {
  id: string;
  title: string;
  client_id: string;
  client_address_id: string | null;
  service_type_id: string | null;
  description: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  status: ServiceStatus;
  sale_amount: number;
  estimated_cost_amount: number;
  estimated_start_at: string | null;
  estimated_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  warranty_until: string | null;
  origin_visit_id?: string | null;
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "id" | "name" | "phone" | "document"> | null;
  service_types?: Pick<ServiceType, "id" | "name"> | null;
  service_costs?: ServiceCost[];
  service_items?: ServiceItem[];
  service_employees?: ServiceEmployee[];
};

export type VisitStatus =
  | "AGENDADA"
  | "CONFIRMADA"
  | "CONCLUIDA"
  | "CONVERTIDA_ORCAMENTO"
  | "CANCELADA";

export type Visit = {
  id: string;
  client_id: string;
  client_address_id: string | null;
  title: string;
  status: VisitStatus;
  priority: "BAIXA" | "MEDIA" | "ALTA";
  scheduled_start_at: string;
  scheduled_end_at: string;
  address_snapshot: string | null;
  description: string | null;
  internal_notes: string | null;
  outcome_summary: string | null;
  next_action: string | null;
  created_by: string;
  converted_service_id: string | null;
  created_at: string;
  updated_at: string;
  clients?: Pick<Client, "id" | "name" | "phone" | "email"> | null;
  visit_assignees?: Array<{
    id: string;
    profile_id: string;
    role_on_visit: "RESPONSAVEL" | "TECNICO" | "OBSERVADOR";
    profiles?: {
      id: string;
      full_name: string | null;
    } | null;
  }>;
  visit_attachments?: VisitAttachment[];
};

export type VisitAttachment = {
  id: string;
  visit_id: string;
  client_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
  signed_url?: string | null;
};

export type CalendarEvent = {
  id: string;
  event_type: "VISITA" | "SERVICO";
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  client_id: string;
  responsible_id: string | null;
  href: string;
};

export type ClientHistoryEvent = {
  client_id: string;
  event_type: "CLIENTE" | "VISITA" | "NOTA" | "SERVICO" | "FISCAL";
  event_label: string;
  event_date: string;
  status: string;
  source_table: string;
  source_id: string;
  headline: string;
  description: string | null;
  color_token: string;
  responsible_id: string | null;
};

export type VisitMetrics = {
  total_visits: number;
  scheduled_visits: number;
  completed_visits: number;
  converted_visits: number;
  cancelled_visits: number;
  visit_to_quote_rate: number | null;
  cancellation_rate: number | null;
  average_hours_to_quote: number | null;
};

export type FiscalDocument = {
  id: string;
  service_id: string;
  document_type: "NFSE" | "NFE" | "OUTRO";
  status:
    | "NAO_EMITIDA"
    | "PREPARADA"
    | "EMITIDA"
    | "CANCELADA"
    | "ERRO"
    | "AGUARDANDO_CONTABILIDADE";
  amount: number;
  customer_name: string;
  fiscal_description: string;
  number: string | null;
  series: string | null;
  access_key: string | null;
  consultation_url: string | null;
  notes: string | null;
  created_at: string;
  services?: Pick<Service, "id" | "title"> & {
    clients?: Pick<Client, "id" | "name"> | null;
  };
};

export type GeneratedDocument = {
  id: string;
  service_id: string;
  name: string;
  storage_path: string;
  created_at: string;
  services?: Pick<Service, "id" | "title"> | null;
  signed_url?: string | null;
};
