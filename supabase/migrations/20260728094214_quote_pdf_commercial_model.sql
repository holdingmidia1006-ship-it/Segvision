create sequence if not exists public.quote_number_seq;

alter table public.services
  add column if not exists quote_number text,
  add column if not exists quote_version integer not null default 1 check (quote_version > 0),
  add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  add column if not exists additional_amount numeric(12,2) not null default 0 check (additional_amount >= 0),
  add column if not exists total_final numeric(12,2) generated always as
    (sale_amount + additional_amount - discount_amount) stored,
  add column if not exists service_line_label text not null default 'Mão de obra e Serviços',
  add column if not exists payment_terms text,
  add column if not exists execution_deadline text,
  add column if not exists warranty_terms text,
  add column if not exists valid_until date;

alter table public.services
  add constraint services_total_final_nonnegative
  check (sale_amount + additional_amount - discount_amount >= 0);

alter table public.service_items
  add column if not exists position integer not null default 0 check (position >= 0);

alter table public.generated_documents
  add column if not exists quote_number text,
  add column if not exists quote_version integer,
  add column if not exists total_amount numeric(12,2),
  add column if not exists service_status public.service_status;

with numbered as (
  select
    id,
    row_number() over (order by created_at, id) as sequence_number,
    extract(year from created_at)::integer as quote_year
  from public.services
  where quote_number is null
)
update public.services as service
set quote_number =
  'ORC-' || numbered.quote_year || '-' || lpad(numbered.sequence_number::text, 6, '0')
from numbered
where service.id = numbered.id;

select setval(
  'public.quote_number_seq',
  greatest((select count(*) from public.services), 1),
  (select count(*) from public.services) > 0
);

create unique index if not exists services_quote_number_key
on public.services (quote_number);

create or replace function private.assign_quote_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.quote_number is null or btrim(new.quote_number) = '' then
    new.quote_number :=
      'ORC-' || extract(year from coalesce(new.created_at, now()))::integer ||
      '-' || lpad(nextval('public.quote_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists services_assign_quote_number on public.services;
create trigger services_assign_quote_number
before insert on public.services
for each row execute function private.assign_quote_number();

alter table public.services alter column quote_number set not null;

create or replace function private.calculate_service_item_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.total_price := round(new.quantity * new.unit_price, 2);
  return new;
end;
$$;

drop trigger if exists service_items_calculate_total on public.service_items;
create trigger service_items_calculate_total
before insert or update of quantity, unit_price on public.service_items
for each row execute function private.calculate_service_item_total();

create table if not exists public.company_settings (
  id boolean primary key default true check (id),
  legal_name text not null,
  trade_name text not null,
  document text not null,
  phone text,
  email text,
  instagram text,
  street text,
  number text,
  complement text,
  district text,
  city text not null,
  state text not null,
  postal_code text,
  responsible_name text,
  responsible_role text,
  banner_path text not null default '/segvisiom/banner-header-segvisiom.png',
  default_validity_days integer not null default 10 check (default_validity_days > 0),
  default_payment_terms text,
  default_execution_deadline text,
  default_warranty_terms text,
  updated_at timestamptz not null default now()
);

insert into public.company_settings (
  id,
  legal_name,
  trade_name,
  document,
  phone,
  instagram,
  street,
  number,
  district,
  city,
  state,
  postal_code,
  responsible_name,
  responsible_role,
  banner_path,
  default_payment_terms,
  default_execution_deadline,
  default_warranty_terms
)
values (
  true,
  'Glaucione Segurado de Miranda Vasconcelos',
  'SEG VISIOM',
  '27.491.886/0001-70',
  '(62) 98443-4663',
  '@SegVisiom',
  'R. Valença',
  'S/N, Qd.111 Lt.16',
  'Set. Leste Universitário',
  'Goiânia',
  'GO',
  '74615-280',
  'Leonardo Cândido Vasconcelos',
  'Técnico em Telecomunicação e Elétrica',
  '/segvisiom/banner-header-segvisiom.png',
  'Formas de pagamento a combinar.',
  'Prazo de execução a combinar após a aprovação.',
  'Garantia dos serviços conforme legislação vigente.'
)
on conflict (id) do update set
  banner_path = excluded.banner_path,
  updated_at = now();

drop trigger if exists company_settings_updated_at on public.company_settings;
create trigger company_settings_updated_at
before update on public.company_settings
for each row execute function private.set_updated_at();

alter table public.company_settings enable row level security;

create policy company_settings_select_active
on public.company_settings for select to authenticated
using ((select private.is_active_user()));

create policy company_settings_manage_admin
on public.company_settings for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant select on public.company_settings to authenticated;
grant insert, update, delete on public.company_settings to authenticated;
grant usage, select on sequence public.quote_number_seq to authenticated;

revoke all on function private.assign_quote_number() from public, anon, authenticated;
revoke all on function private.calculate_service_item_total() from public, anon, authenticated;
