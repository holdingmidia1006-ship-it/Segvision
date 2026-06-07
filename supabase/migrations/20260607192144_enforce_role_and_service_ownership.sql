create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and active = true
      and role = 'ADMIN'::public.user_role
  );
$$;

create or replace function private.owns_service(target_service_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.services
    where id = target_service_id
      and created_by = auth.uid()
  );
$$;

create or replace function private.record_service_status()
returns trigger
language plpgsql
security definer
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

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.owns_service(uuid) to authenticated;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy profiles_admin_all
on public.profiles for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

do $$
declare
  table_name text;
  policy_record record;
begin
  foreach table_name in array array[
    'clients',
    'client_addresses',
    'employees',
    'service_types',
    'catalog_items',
    'services',
    'service_items',
    'service_employees',
    'service_costs',
    'service_status_history',
    'service_attachments',
    'document_templates',
    'generated_documents',
    'fiscal_documents'
  ]
  loop
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        table_name
      );
    end loop;

    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      'admin_all_' || table_name,
      table_name
    );
  end loop;
end;
$$;

create policy active_select_clients
on public.clients for select to authenticated
using ((select private.is_active_user()));
create policy active_insert_clients
on public.clients for insert to authenticated
with check ((select private.is_active_user()));
create policy active_update_clients
on public.clients for update to authenticated
using ((select private.is_active_user()))
with check ((select private.is_active_user()));

create policy active_select_client_addresses
on public.client_addresses for select to authenticated
using ((select private.is_active_user()));
create policy active_insert_client_addresses
on public.client_addresses for insert to authenticated
with check ((select private.is_active_user()));
create policy active_update_client_addresses
on public.client_addresses for update to authenticated
using ((select private.is_active_user()))
with check ((select private.is_active_user()));

create policy active_select_employees
on public.employees for select to authenticated
using ((select private.is_active_user()));
create policy active_select_service_types
on public.service_types for select to authenticated
using ((select private.is_active_user()));
create policy active_select_catalog_items
on public.catalog_items for select to authenticated
using ((select private.is_active_user()));
create policy active_select_document_templates
on public.document_templates for select to authenticated
using ((select private.is_active_user()));

drop policy if exists admin_all_service_status_history
on public.service_status_history;
create policy admin_select_service_status_history
on public.service_status_history for select to authenticated
using ((select private.is_admin()));

create policy operator_select_own_services
on public.services for select to authenticated
using (
  (select private.is_active_user())
  and created_by = (select auth.uid())
);
create policy operator_insert_own_services
on public.services for insert to authenticated
with check (
  (select private.is_active_user())
  and created_by = (select auth.uid())
);
create policy operator_update_own_services
on public.services for update to authenticated
using (
  (select private.is_active_user())
  and created_by = (select auth.uid())
)
with check (
  (select private.is_active_user())
  and created_by = (select auth.uid())
);

create policy operator_all_own_service_items
on public.service_items for all to authenticated
using ((select private.owns_service(service_id)))
with check ((select private.owns_service(service_id)));

create policy operator_all_own_service_employees
on public.service_employees for all to authenticated
using ((select private.owns_service(service_id)))
with check ((select private.owns_service(service_id)));

create policy operator_all_own_service_costs
on public.service_costs for all to authenticated
using ((select private.owns_service(service_id)))
with check (
  (select private.owns_service(service_id))
  and created_by = (select auth.uid())
);

create policy operator_select_own_service_history
on public.service_status_history for select to authenticated
using ((select private.owns_service(service_id)));

create policy operator_all_own_service_attachments
on public.service_attachments for all to authenticated
using ((select private.owns_service(service_id)))
with check (
  (select private.owns_service(service_id))
  and created_by = (select auth.uid())
);

create policy operator_select_own_generated_documents
on public.generated_documents for select to authenticated
using ((select private.owns_service(service_id)));
create policy operator_insert_own_generated_documents
on public.generated_documents for insert to authenticated
with check (
  (select private.owns_service(service_id))
  and created_by = (select auth.uid())
);
create policy operator_delete_own_generated_documents
on public.generated_documents for delete to authenticated
using ((select private.owns_service(service_id)));

create policy operator_all_own_fiscal_documents
on public.fiscal_documents for all to authenticated
using ((select private.owns_service(service_id)))
with check (
  (select private.owns_service(service_id))
  and created_by = (select auth.uid())
);

drop policy if exists authenticated_read_private_files on storage.objects;
drop policy if exists authenticated_insert_private_files on storage.objects;
drop policy if exists authenticated_update_private_files on storage.objects;
drop policy if exists authenticated_delete_private_files on storage.objects;

create policy admin_all_private_files
on storage.objects for all to authenticated
using (
  (select private.is_admin())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
)
with check (
  (select private.is_admin())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy active_read_document_templates
on storage.objects for select to authenticated
using (
  (select private.is_active_user())
  and bucket_id = 'document-templates'
);

create policy operator_read_own_service_files
on storage.objects for select to authenticated
using (
  bucket_id in ('generated-documents', 'service-attachments')
  and (select private.owns_service(
    (
      select s.id
      from public.services s
      where s.id::text = (storage.foldername(name))[1]
      limit 1
    )
  ))
);

create policy operator_insert_own_service_files
on storage.objects for insert to authenticated
with check (
  bucket_id in ('generated-documents', 'service-attachments')
  and (select private.owns_service(
    (
      select s.id
      from public.services s
      where s.id::text = (storage.foldername(name))[1]
      limit 1
    )
  ))
);

create policy operator_update_own_service_files
on storage.objects for update to authenticated
using (
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
with check (
  bucket_id in ('generated-documents', 'service-attachments')
  and (select private.owns_service(
    (
      select s.id
      from public.services s
      where s.id::text = (storage.foldername(name))[1]
      limit 1
    )
  ))
);

create policy operator_delete_own_service_files
on storage.objects for delete to authenticated
using (
  bucket_id in ('generated-documents', 'service-attachments')
  and (select private.owns_service(
    (
      select s.id
      from public.services s
      where s.id::text = (storage.foldername(name))[1]
      limit 1
    )
  ))
);
