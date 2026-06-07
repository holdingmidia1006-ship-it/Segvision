do $$
declare
  table_name text;
  policy_record record;
begin
  foreach table_name in array array[
    'profiles',
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
  end loop;
end;
$$;

create policy profiles_select_authorized
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);
create policy profiles_insert_admin
on public.profiles for insert to authenticated
with check ((select private.is_admin()));
create policy profiles_update_admin
on public.profiles for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy profiles_delete_admin
on public.profiles for delete to authenticated
using ((select private.is_admin()));

create policy clients_select_active
on public.clients for select to authenticated
using ((select private.is_active_user()));
create policy clients_insert_active
on public.clients for insert to authenticated
with check ((select private.is_active_user()));
create policy clients_update_active
on public.clients for update to authenticated
using ((select private.is_active_user()))
with check ((select private.is_active_user()));
create policy clients_delete_admin
on public.clients for delete to authenticated
using ((select private.is_admin()));

create policy client_addresses_select_active
on public.client_addresses for select to authenticated
using ((select private.is_active_user()));
create policy client_addresses_insert_active
on public.client_addresses for insert to authenticated
with check ((select private.is_active_user()));
create policy client_addresses_update_active
on public.client_addresses for update to authenticated
using ((select private.is_active_user()))
with check ((select private.is_active_user()));
create policy client_addresses_delete_admin
on public.client_addresses for delete to authenticated
using ((select private.is_admin()));

create policy employees_select_active
on public.employees for select to authenticated
using ((select private.is_active_user()));
create policy employees_insert_admin
on public.employees for insert to authenticated
with check ((select private.is_admin()));
create policy employees_update_admin
on public.employees for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy employees_delete_admin
on public.employees for delete to authenticated
using ((select private.is_admin()));

create policy service_types_select_active
on public.service_types for select to authenticated
using ((select private.is_active_user()));
create policy service_types_insert_admin
on public.service_types for insert to authenticated
with check ((select private.is_admin()));
create policy service_types_update_admin
on public.service_types for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy service_types_delete_admin
on public.service_types for delete to authenticated
using ((select private.is_admin()));

create policy catalog_items_select_active
on public.catalog_items for select to authenticated
using ((select private.is_active_user()));
create policy catalog_items_insert_admin
on public.catalog_items for insert to authenticated
with check ((select private.is_admin()));
create policy catalog_items_update_admin
on public.catalog_items for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy catalog_items_delete_admin
on public.catalog_items for delete to authenticated
using ((select private.is_admin()));

create policy document_templates_select_active
on public.document_templates for select to authenticated
using ((select private.is_active_user()));
create policy document_templates_insert_admin
on public.document_templates for insert to authenticated
with check ((select private.is_admin()));
create policy document_templates_update_admin
on public.document_templates for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy document_templates_delete_admin
on public.document_templates for delete to authenticated
using ((select private.is_admin()));

create policy services_select_authorized
on public.services for select to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and created_by = (select auth.uid())
  )
);
create policy services_insert_authorized
on public.services for insert to authenticated
with check (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and created_by = (select auth.uid())
  )
);
create policy services_update_authorized
on public.services for update to authenticated
using (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and created_by = (select auth.uid())
  )
)
with check (
  (select private.is_admin())
  or (
    (select private.is_active_user())
    and created_by = (select auth.uid())
  )
);
create policy services_delete_admin
on public.services for delete to authenticated
using ((select private.is_admin()));

create policy service_items_manage_authorized
on public.service_items for all to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
)
with check (
  (select private.is_admin())
  or (select private.owns_service(service_id))
);

create policy service_employees_manage_authorized
on public.service_employees for all to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
)
with check (
  (select private.is_admin())
  or (select private.owns_service(service_id))
);

create policy service_costs_manage_authorized
on public.service_costs for all to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
)
with check (
  (select private.is_admin())
  or (
    (select private.owns_service(service_id))
    and created_by = (select auth.uid())
  )
);

create policy service_history_select_authorized
on public.service_status_history for select to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
);

create policy service_attachments_manage_authorized
on public.service_attachments for all to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
)
with check (
  (select private.is_admin())
  or (
    (select private.owns_service(service_id))
    and created_by = (select auth.uid())
  )
);

create policy generated_documents_select_authorized
on public.generated_documents for select to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
);
create policy generated_documents_insert_authorized
on public.generated_documents for insert to authenticated
with check (
  (select private.is_admin())
  or (
    (select private.owns_service(service_id))
    and created_by = (select auth.uid())
  )
);
create policy generated_documents_delete_authorized
on public.generated_documents for delete to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
);

create policy fiscal_documents_manage_authorized
on public.fiscal_documents for all to authenticated
using (
  (select private.is_admin())
  or (select private.owns_service(service_id))
)
with check (
  (select private.is_admin())
  or (
    (select private.owns_service(service_id))
    and created_by = (select auth.uid())
  )
);

drop policy if exists admin_all_private_files on storage.objects;
drop policy if exists active_read_document_templates on storage.objects;
drop policy if exists operator_read_own_service_files on storage.objects;
drop policy if exists operator_insert_own_service_files on storage.objects;
drop policy if exists operator_update_own_service_files on storage.objects;
drop policy if exists operator_delete_own_service_files on storage.objects;

create policy private_files_select_authorized
on storage.objects for select to authenticated
using (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments'
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
);

create policy private_files_insert_authorized
on storage.objects for insert to authenticated
with check (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments'
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
);

create policy private_files_update_authorized
on storage.objects for update to authenticated
using (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments'
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
)
with check (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments'
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
);

create policy private_files_delete_authorized
on storage.objects for delete to authenticated
using (
  (
    (select private.is_admin())
    and bucket_id in (
      'document-templates',
      'generated-documents',
      'service-attachments'
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
);
