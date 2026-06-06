create or replace function private.is_active_user()
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
  );
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;

do $$
declare
  table_name text;
  policy_name text;
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
    policy_name := 'authenticated_all_' || table_name;
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_active_user())) with check ((select private.is_active_user()))',
      policy_name,
      table_name
    );
  end loop;
end;
$$;

drop policy if exists authenticated_read_private_files on storage.objects;
drop policy if exists authenticated_insert_private_files on storage.objects;
drop policy if exists authenticated_update_private_files on storage.objects;
drop policy if exists authenticated_delete_private_files on storage.objects;

create policy authenticated_read_private_files
on storage.objects for select to authenticated
using (
  (select private.is_active_user())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy authenticated_insert_private_files
on storage.objects for insert to authenticated
with check (
  (select private.is_active_user())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy authenticated_update_private_files
on storage.objects for update to authenticated
using (
  (select private.is_active_user())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
)
with check (
  (select private.is_active_user())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

create policy authenticated_delete_private_files
on storage.objects for delete to authenticated
using (
  (select private.is_active_user())
  and bucket_id in (
    'document-templates',
    'generated-documents',
    'service-attachments'
  )
);

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable()
    from public, anon, authenticated;
  end if;
end;
$$;

create index if not exists services_address_idx
on public.services (client_address_id);
create index if not exists services_type_idx
on public.services (service_type_id);
create index if not exists services_created_by_idx
on public.services (created_by);
create index if not exists service_items_catalog_idx
on public.service_items (catalog_item_id);
create index if not exists service_employees_employee_idx
on public.service_employees (employee_id);
create index if not exists service_costs_employee_idx
on public.service_costs (employee_id);
create index if not exists service_costs_created_by_idx
on public.service_costs (created_by);
create index if not exists service_history_changed_by_idx
on public.service_status_history (changed_by);
create index if not exists service_attachments_service_idx
on public.service_attachments (service_id);
create index if not exists service_attachments_created_by_idx
on public.service_attachments (created_by);
create index if not exists document_templates_created_by_idx
on public.document_templates (created_by);
create index if not exists generated_documents_service_idx
on public.generated_documents (service_id);
create index if not exists generated_documents_template_idx
on public.generated_documents (template_id);
create index if not exists generated_documents_created_by_idx
on public.generated_documents (created_by);
create index if not exists fiscal_documents_created_by_idx
on public.fiscal_documents (created_by);
