create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.person_type as enum ('PF', 'PJ');
create type public.user_role as enum ('ADMIN', 'OPERADOR');
create type public.service_status as enum (
  'ORCAMENTO',
  'EM_EXECUCAO',
  'GARANTIA',
  'FINALIZADO',
  'CANCELADO'
);
create type public.cost_category as enum (
  'COMBUSTIVEL',
  'ALMOCO',
  'DIARIA',
  'MEIA_DIARIA',
  'BONIFICACAO',
  'MATERIAL_EXTRA',
  'PEDAGIO',
  'ESTACIONAMENTO',
  'ALUGUEL_EQUIPAMENTO',
  'OUTROS'
);
create type public.fiscal_document_type as enum ('NFSE', 'NFE', 'OUTRO');
create type public.fiscal_status as enum (
  'NAO_EMITIDA',
  'PREPARADA',
  'EMITIDA',
  'CANCELADA',
  'ERRO',
  'AGUARDANDO_CONTABILIDADE'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'OPERADOR',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  person_type public.person_type not null default 'PF',
  document text,
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null default 'Principal',
  street text not null,
  number text,
  complement text,
  district text,
  city text not null,
  state text not null,
  postal_code text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  daily_rate numeric(12,2) not null default 0 check (daily_rate >= 0),
  half_daily_rate numeric(12,2) not null default 0 check (half_daily_rate >= 0),
  default_bonus numeric(12,2) not null default 0 check (default_bonus >= 0),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'un',
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  standard_cost numeric(12,2) not null default 0 check (standard_cost >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid not null references public.clients(id),
  client_address_id uuid references public.client_addresses(id) on delete set null,
  service_type_id uuid references public.service_types(id) on delete set null,
  description text,
  customer_notes text,
  internal_notes text,
  status public.service_status not null default 'ORCAMENTO',
  sale_amount numeric(12,2) not null default 0 check (sale_amount >= 0),
  estimated_cost_amount numeric(12,2) not null default 0 check (estimated_cost_amount >= 0),
  estimated_start_at timestamptz,
  estimated_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  warranty_until date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estimated_end_at is null or estimated_start_at is null or estimated_end_at >= estimated_start_at),
  check (actual_end_at is null or actual_start_at is null or actual_end_at >= actual_start_at)
);

create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  description text not null,
  unit text not null default 'un',
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  total_price numeric(12,2) not null default 0 check (total_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_employees (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  daily_rate_snapshot numeric(12,2) not null default 0,
  half_daily_rate_snapshot numeric(12,2) not null default 0,
  bonus_snapshot numeric(12,2) not null default 0,
  days_worked numeric(8,2) not null default 0,
  half_days_worked numeric(8,2) not null default 0,
  bonus_paid numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, employee_id)
);

create table public.service_costs (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  category public.cost_category not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  cost_date date not null default current_date,
  visible_to_customer boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_status_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  from_status public.service_status,
  to_status public.service_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.service_attachments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  mime_type text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  template_id uuid references public.document_templates(id) on delete set null,
  name text not null,
  storage_path text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  document_type public.fiscal_document_type not null,
  status public.fiscal_status not null default 'NAO_EMITIDA',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  customer_name text not null,
  fiscal_description text not null,
  number text,
  series text,
  access_key text,
  consultation_url text,
  xml_path text,
  pdf_path text,
  notes text,
  provider text not null default 'MANUAL',
  provider_reference text,
  provider_response jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_name_idx on public.clients using btree (name);
create index client_addresses_client_idx on public.client_addresses (client_id);
create index employees_name_idx on public.employees using btree (name);
create index services_client_idx on public.services (client_id);
create index services_status_idx on public.services (status);
create index services_created_at_idx on public.services (created_at desc);
create index service_items_service_idx on public.service_items (service_id);
create index service_employees_service_idx on public.service_employees (service_id);
create index service_costs_service_date_idx on public.service_costs (service_id, cost_date desc);
create index service_status_history_service_idx on public.service_status_history (service_id, changed_at desc);
create index fiscal_documents_service_idx on public.fiscal_documents (service_id);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when not exists (select 1 from public.profiles) then 'ADMIN'::public.user_role
      else 'OPERADOR'::public.user_role
    end
  );
  return new;
end;
$$;

create or replace function private.record_service_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.service_status_history (
      service_id,
      from_status,
      to_status,
      changed_by
    )
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create trigger services_status_history
after insert or update of status on public.services
for each row execute function private.record_service_status();

create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger clients_updated_at before update on public.clients
for each row execute function private.set_updated_at();
create trigger client_addresses_updated_at before update on public.client_addresses
for each row execute function private.set_updated_at();
create trigger employees_updated_at before update on public.employees
for each row execute function private.set_updated_at();
create trigger service_types_updated_at before update on public.service_types
for each row execute function private.set_updated_at();
create trigger catalog_items_updated_at before update on public.catalog_items
for each row execute function private.set_updated_at();
create trigger services_updated_at before update on public.services
for each row execute function private.set_updated_at();
create trigger service_items_updated_at before update on public.service_items
for each row execute function private.set_updated_at();
create trigger service_employees_updated_at before update on public.service_employees
for each row execute function private.set_updated_at();
create trigger service_costs_updated_at before update on public.service_costs
for each row execute function private.set_updated_at();
create trigger document_templates_updated_at before update on public.document_templates
for each row execute function private.set_updated_at();
create trigger fiscal_documents_updated_at before update on public.fiscal_documents
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_addresses enable row level security;
alter table public.employees enable row level security;
alter table public.service_types enable row level security;
alter table public.catalog_items enable row level security;
alter table public.services enable row level security;
alter table public.service_items enable row level security;
alter table public.service_employees enable row level security;
alter table public.service_costs enable row level security;
alter table public.service_status_history enable row level security;
alter table public.service_attachments enable row level security;
alter table public.document_templates enable row level security;
alter table public.generated_documents enable row level security;
alter table public.fiscal_documents enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy authenticated_all_clients on public.clients
for all to authenticated using (true) with check (true);
create policy authenticated_all_client_addresses on public.client_addresses
for all to authenticated using (true) with check (true);
create policy authenticated_all_employees on public.employees
for all to authenticated using (true) with check (true);
create policy authenticated_all_service_types on public.service_types
for all to authenticated using (true) with check (true);
create policy authenticated_all_catalog_items on public.catalog_items
for all to authenticated using (true) with check (true);
create policy authenticated_all_services on public.services
for all to authenticated using (true) with check (true);
create policy authenticated_all_service_items on public.service_items
for all to authenticated using (true) with check (true);
create policy authenticated_all_service_employees on public.service_employees
for all to authenticated using (true) with check (true);
create policy authenticated_all_service_costs on public.service_costs
for all to authenticated using (true) with check (true);
create policy authenticated_all_service_status_history on public.service_status_history
for all to authenticated using (true) with check (true);
create policy authenticated_all_service_attachments on public.service_attachments
for all to authenticated using (true) with check (true);
create policy authenticated_all_document_templates on public.document_templates
for all to authenticated using (true) with check (true);
create policy authenticated_all_generated_documents on public.generated_documents
for all to authenticated using (true) with check (true);
create policy authenticated_all_fiscal_documents on public.fiscal_documents
for all to authenticated using (true) with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('document-templates', 'document-templates', false, 10485760),
  ('generated-documents', 'generated-documents', false, 10485760),
  ('service-attachments', 'service-attachments', false, 20971520)
on conflict (id) do nothing;

create policy authenticated_read_private_files
on storage.objects for select to authenticated
using (
  bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy authenticated_insert_private_files
on storage.objects for insert to authenticated
with check (
  bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy authenticated_update_private_files
on storage.objects for update to authenticated
using (
  bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
)
with check (
  bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy authenticated_delete_private_files
on storage.objects for delete to authenticated
using (
  bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

insert into public.service_types (name, description)
values
  ('Instalação de CFTV', 'Câmeras, gravadores e acesso remoto.'),
  ('Cabeamento estruturado', 'Pontos de rede, racks e organização.'),
  ('Cerca elétrica', 'Instalação e manutenção de perímetro.'),
  ('Automação', 'Portões, controles e integrações.'),
  ('Manutenção', 'Diagnóstico e correção de instalações.')
on conflict (name) do nothing;

insert into public.catalog_items (name, unit, sale_price, standard_cost)
values
  ('Ponto de câmera instalado', 'un', 850, 520),
  ('Ponto de rede CAT6', 'un', 290, 150),
  ('Diária técnica', 'dia', 650, 280)
on conflict (name) do nothing;
