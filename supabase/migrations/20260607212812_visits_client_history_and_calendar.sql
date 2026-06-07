create type public.client_record_type as enum ('LEAD', 'CLIENTE');
create type public.visit_status as enum (
  'AGENDADA',
  'CONFIRMADA',
  'CONCLUIDA',
  'CONVERTIDA_ORCAMENTO',
  'CANCELADA'
);
create type public.visit_priority as enum ('BAIXA', 'MEDIA', 'ALTA');
create type public.visit_assignee_role as enum (
  'RESPONSAVEL',
  'TECNICO',
  'OBSERVADOR'
);
create type public.client_note_type as enum (
  'MANUAL',
  'COMERCIAL',
  'TECNICA'
);

alter table public.clients
  add column record_type public.client_record_type not null default 'CLIENTE',
  add column source text,
  add column created_by uuid references auth.users(id) on delete set null;

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  role_or_department text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  client_address_id uuid references public.client_addresses(id) on delete set null,
  title text not null,
  status public.visit_status not null default 'AGENDADA',
  priority public.visit_priority not null default 'MEDIA',
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  address_snapshot text,
  description text,
  internal_notes text,
  outcome_summary text,
  next_action text,
  reminder_sent_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  converted_service_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_at > scheduled_start_at)
);

alter table public.services
  add column origin_visit_id uuid references public.visits(id) on delete set null;

alter table public.visits
  add constraint visits_converted_service_id_fkey
  foreign key (converted_service_id)
  references public.services(id)
  on delete set null;

create table public.visit_assignees (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_on_visit public.visit_assignee_role not null default 'TECNICO',
  created_at timestamptz not null default now(),
  unique (visit_id, profile_id)
);

create table public.visit_attachments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  note_type public.client_note_type not null default 'MANUAL',
  content text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index clients_phone_idx on public.clients (phone);
create index clients_created_by_idx on public.clients (created_by);
create index client_contacts_client_idx on public.client_contacts (client_id);
create index visits_client_date_idx
  on public.visits (client_id, scheduled_start_at desc);
create index visits_status_date_idx
  on public.visits (status, scheduled_start_at);
create index visits_created_by_idx on public.visits (created_by);
create index visit_assignees_profile_idx
  on public.visit_assignees (profile_id, visit_id);
create index visit_attachments_visit_idx on public.visit_attachments (visit_id);
create index visit_attachments_client_idx on public.visit_attachments (client_id);
create index visit_attachments_uploaded_by_idx
  on public.visit_attachments (uploaded_by);
create index client_notes_client_date_idx
  on public.client_notes (client_id, created_at desc);
create index client_notes_visit_idx on public.client_notes (visit_id);
create index client_notes_service_idx on public.client_notes (service_id);
create index client_notes_created_by_idx on public.client_notes (created_by);
create index visits_address_idx on public.visits (client_address_id);
create index visits_converted_service_idx
  on public.visits (converted_service_id)
  where converted_service_id is not null;
create index services_origin_visit_idx
  on public.services (origin_visit_id)
  where origin_visit_id is not null;

create trigger client_contacts_updated_at
before update on public.client_contacts
for each row execute function private.set_updated_at();

create trigger visits_updated_at
before update on public.visits
for each row execute function private.set_updated_at();

create or replace function private.can_access_visit(target_visit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_admin())
    or exists (
      select 1
      from public.visits v
      where v.id = target_visit_id
        and v.created_by = (select auth.uid())
    )
    or exists (
      select 1
      from public.visit_assignees va
      where va.visit_id = target_visit_id
        and va.profile_id = (select auth.uid())
    );
$$;

revoke all on function private.can_access_visit(uuid) from public;
grant execute on function private.can_access_visit(uuid) to authenticated;

alter table public.client_contacts enable row level security;
alter table public.visits enable row level security;
alter table public.visit_assignees enable row level security;
alter table public.visit_attachments enable row level security;
alter table public.client_notes enable row level security;

create policy client_contacts_select_active
on public.client_contacts for select to authenticated
using ((select private.is_active_user()));
create policy client_contacts_insert_active
on public.client_contacts for insert to authenticated
with check ((select private.is_active_user()));
create policy client_contacts_update_active
on public.client_contacts for update to authenticated
using ((select private.is_active_user()))
with check ((select private.is_active_user()));
create policy client_contacts_delete_admin
on public.client_contacts for delete to authenticated
using ((select private.is_admin()));

create policy visits_select_authorized
on public.visits for select to authenticated
using (
  (select private.is_active_user())
  and (
    created_by = (select auth.uid())
    or (select private.can_access_visit(id))
  )
);
create policy visits_insert_authorized
on public.visits for insert to authenticated
with check (
  (select private.is_active_user())
  and (
    (select private.is_admin())
    or created_by = (select auth.uid())
  )
);
create policy visits_update_authorized
on public.visits for update to authenticated
using (
  (select private.is_active_user())
  and (select private.can_access_visit(id))
)
with check (
  (select private.is_active_user())
  and (select private.can_access_visit(id))
);
create policy visits_delete_authorized
on public.visits for delete to authenticated
using (
  (select private.is_admin())
  or created_by = (select auth.uid())
);

create policy visit_assignees_select_authorized
on public.visit_assignees for select to authenticated
using ((select private.can_access_visit(visit_id)));
create policy visit_assignees_insert_authorized
on public.visit_assignees for insert to authenticated
with check ((select private.can_access_visit(visit_id)));
create policy visit_assignees_update_authorized
on public.visit_assignees for update to authenticated
using ((select private.can_access_visit(visit_id)))
with check ((select private.can_access_visit(visit_id)));
create policy visit_assignees_delete_authorized
on public.visit_assignees for delete to authenticated
using ((select private.can_access_visit(visit_id)));

create policy visit_attachments_select_authorized
on public.visit_attachments for select to authenticated
using ((select private.can_access_visit(visit_id)));
create policy visit_attachments_insert_authorized
on public.visit_attachments for insert to authenticated
with check (
  (select private.can_access_visit(visit_id))
  and uploaded_by = (select auth.uid())
);
create policy visit_attachments_delete_authorized
on public.visit_attachments for delete to authenticated
using ((select private.can_access_visit(visit_id)));

create policy client_notes_select_authorized
on public.client_notes for select to authenticated
using (
  (select private.is_admin())
  or created_by = (select auth.uid())
  or (visit_id is not null and (select private.can_access_visit(visit_id)))
  or (service_id is not null and (select private.owns_service(service_id)))
);
create policy client_notes_insert_active
on public.client_notes for insert to authenticated
with check (
  (select private.is_active_user())
  and created_by = (select auth.uid())
);
create policy client_notes_update_authorized
on public.client_notes for update to authenticated
using (
  (select private.is_admin())
  or created_by = (select auth.uid())
)
with check (
  (select private.is_admin())
  or created_by = (select auth.uid())
);
create policy client_notes_delete_authorized
on public.client_notes for delete to authenticated
using (
  (select private.is_admin())
  or created_by = (select auth.uid())
);

create or replace view public.vw_client_history
with (security_invoker = true)
as
select
  c.id as client_id,
  'CLIENTE'::text as event_type,
  case when c.record_type = 'LEAD' then 'Lead cadastrado' else 'Cliente cadastrado' end as event_label,
  c.created_at as event_date,
  c.record_type::text as status,
  'clients'::text as source_table,
  c.id as source_id,
  c.name as headline,
  c.notes as description,
  'blue'::text as color_token,
  c.created_by as responsible_id
from public.clients c
union all
select
  v.client_id,
  'VISITA',
  case v.status
    when 'AGENDADA' then 'Visita agendada'
    when 'CONFIRMADA' then 'Visita confirmada'
    when 'CONCLUIDA' then 'Visita concluída'
    when 'CONVERTIDA_ORCAMENTO' then 'Visita convertida em orçamento'
    else 'Visita cancelada'
  end,
  coalesce(v.updated_at, v.scheduled_start_at),
  v.status::text,
  'visits',
  v.id,
  v.title,
  coalesce(v.outcome_summary, v.description),
  case v.status
    when 'AGENDADA' then 'blue'
    when 'CONFIRMADA' then 'purple'
    when 'CONCLUIDA' then 'green'
    when 'CONVERTIDA_ORCAMENTO' then 'amber'
    else 'red'
  end,
  v.created_by
from public.visits v
union all
select
  n.client_id,
  'NOTA',
  case n.note_type
    when 'COMERCIAL' then 'Nota comercial'
    when 'TECNICA' then 'Nota técnica'
    else 'Observação'
  end,
  n.created_at,
  n.note_type::text,
  'client_notes',
  n.id,
  'Observação interna',
  n.content,
  'slate',
  n.created_by
from public.client_notes n
union all
select
  s.client_id,
  'SERVICO',
  case s.status
    when 'ORCAMENTO' then 'Orçamento criado'
    when 'EM_EXECUCAO' then 'Serviço em execução'
    when 'GARANTIA' then 'Serviço em garantia'
    when 'FINALIZADO' then 'Serviço finalizado'
    else 'Serviço cancelado'
  end,
  s.updated_at,
  s.status::text,
  'services',
  s.id,
  s.title,
  s.description,
  case s.status
    when 'ORCAMENTO' then 'amber'
    when 'EM_EXECUCAO' then 'blue'
    when 'GARANTIA' then 'orange'
    when 'FINALIZADO' then 'green'
    else 'red'
  end,
  s.created_by
from public.services s
union all
select
  s.client_id,
  'FISCAL',
  'Documento fiscal ' || lower(replace(fd.status::text, '_', ' ')),
  fd.updated_at,
  fd.status::text,
  'fiscal_documents',
  fd.id,
  coalesce(fd.number, fd.document_type::text),
  fd.fiscal_description,
  'purple',
  fd.created_by
from public.fiscal_documents fd
join public.services s on s.id = fd.service_id;

create or replace view public.vw_calendar_events
with (security_invoker = true)
as
select
  v.id,
  'VISITA'::text as event_type,
  v.title,
  v.scheduled_start_at as starts_at,
  v.scheduled_end_at as ends_at,
  v.status::text as status,
  v.client_id,
  v.created_by as responsible_id,
  ('/visits/' || v.id::text)::text as href
from public.visits v
union all
select
  s.id,
  'SERVICO',
  s.title,
  s.estimated_start_at,
  coalesce(s.estimated_end_at, s.estimated_start_at + interval '1 hour'),
  s.status::text,
  s.client_id,
  s.created_by,
  ('/services/' || s.id::text)::text
from public.services s
where s.estimated_start_at is not null;

create or replace view public.vw_visit_conversion_metrics
with (security_invoker = true)
as
select
  count(*) as total_visits,
  count(*) filter (where v.status = 'AGENDADA') as scheduled_visits,
  count(*) filter (where v.status = 'CONCLUIDA') as completed_visits,
  count(*) filter (where v.status = 'CONVERTIDA_ORCAMENTO') as converted_visits,
  count(*) filter (where v.status = 'CANCELADA') as cancelled_visits,
  round(
    100.0 * count(*) filter (where v.status = 'CONVERTIDA_ORCAMENTO')
    / nullif(count(*) filter (where v.status in ('CONCLUIDA', 'CONVERTIDA_ORCAMENTO')), 0),
    2
  ) as visit_to_quote_rate,
  round(
    100.0 * count(*) filter (where v.status = 'CANCELADA')
    / nullif(count(*), 0),
    2
  ) as cancellation_rate,
  round(
    avg(
      extract(epoch from (s.created_at - v.scheduled_end_at)) / 3600
    ) filter (where s.id is not null),
    2
  ) as average_hours_to_quote
from public.visits v
left join public.services s on s.origin_visit_id = v.id;

grant select, insert, update, delete
on public.client_contacts,
   public.visits,
   public.visit_assignees,
   public.visit_attachments,
   public.client_notes
to authenticated;

grant select
on public.vw_client_history,
   public.vw_calendar_events,
   public.vw_visit_conversion_metrics
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('visit-attachments', 'visit-attachments', false, 20971520)
on conflict (id) do nothing;

drop policy if exists private_files_select_authorized on storage.objects;
drop policy if exists private_files_insert_authorized on storage.objects;
drop policy if exists private_files_update_authorized on storage.objects;
drop policy if exists private_files_delete_authorized on storage.objects;

create policy private_files_select_authorized
on storage.objects for select to authenticated
using (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments',
      'visit-attachments'
    )
  )
  or (
    (select private.is_active_user())
    and bucket_id = 'document-templates'
  )
  or (
    bucket_id in ('generated-documents', 'service-attachments')
    and (select private.owns_service(
      (
        select s.id
        from public.services s
        where s.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
  or (
    bucket_id = 'visit-attachments'
    and (select private.can_access_visit(
      (
        select v.id
        from public.visits v
        where v.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
);

create policy private_files_insert_authorized
on storage.objects for insert to authenticated
with check (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments',
      'visit-attachments'
    )
  )
  or (
    bucket_id in ('generated-documents', 'service-attachments')
    and (select private.owns_service(
      (
        select s.id
        from public.services s
        where s.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
  or (
    bucket_id = 'visit-attachments'
    and (select private.can_access_visit(
      (
        select v.id
        from public.visits v
        where v.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
);

create policy private_files_update_authorized
on storage.objects for update to authenticated
using (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments',
      'visit-attachments'
    )
  )
  or (
    bucket_id in ('generated-documents', 'service-attachments')
    and (select private.owns_service(
      (
        select s.id
        from public.services s
        where s.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
  or (
    bucket_id = 'visit-attachments'
    and (select private.can_access_visit(
      (
        select v.id
        from public.visits v
        where v.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
)
with check (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments',
      'visit-attachments'
    )
  )
  or (
    bucket_id in ('generated-documents', 'service-attachments')
    and (select private.owns_service(
      (
        select s.id
        from public.services s
        where s.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
  or (
    bucket_id = 'visit-attachments'
    and (select private.can_access_visit(
      (
        select v.id
        from public.visits v
        where v.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
);

create policy private_files_delete_authorized
on storage.objects for delete to authenticated
using (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments',
      'visit-attachments'
    )
  )
  or (
    bucket_id in ('generated-documents', 'service-attachments')
    and (select private.owns_service(
      (
        select s.id
        from public.services s
        where s.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
  or (
    bucket_id = 'visit-attachments'
    and (select private.can_access_visit(
      (
        select v.id
        from public.visits v
        where v.id::text = (storage.foldername(name))[1]
        limit 1
      )
    ))
  )
);

create or replace function private.can_access_private_file(
  object_bucket text,
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      (select private.is_admin())
      and object_bucket in (
        'document-templates',
        'generated-documents',
        'service-attachments',
        'visit-attachments'
      )
    )
    or (
      (select private.is_active_user())
      and object_bucket = 'document-templates'
    )
    or (
      object_bucket in ('generated-documents', 'service-attachments')
      and (select private.owns_service(
        (
          select s.id
          from public.services s
          where s.id::text = (storage.foldername(object_name))[1]
          limit 1
        )
      ))
    )
    or (
      object_bucket = 'visit-attachments'
      and (select private.can_access_visit(
        (
          select v.id
          from public.visits v
          where v.id::text = (storage.foldername(object_name))[1]
          limit 1
        )
      ))
    );
$$;

revoke all on function private.can_access_private_file(text, text) from public;
grant execute on function private.can_access_private_file(text, text)
to authenticated;

drop policy if exists private_files_select_authorized on storage.objects;
drop policy if exists private_files_insert_authorized on storage.objects;
drop policy if exists private_files_update_authorized on storage.objects;
drop policy if exists private_files_delete_authorized on storage.objects;

create policy private_files_select_authorized
on storage.objects for select to authenticated
using ((select private.can_access_private_file(bucket_id, name)));

create policy private_files_insert_authorized
on storage.objects for insert to authenticated
with check ((select private.can_access_private_file(bucket_id, name)));

create policy private_files_update_authorized
on storage.objects for update to authenticated
using ((select private.can_access_private_file(bucket_id, name)))
with check ((select private.can_access_private_file(bucket_id, name)));

create policy private_files_delete_authorized
on storage.objects for delete to authenticated
using ((select private.can_access_private_file(bucket_id, name)));
