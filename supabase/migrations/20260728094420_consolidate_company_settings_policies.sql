drop policy if exists company_settings_manage_admin
on public.company_settings;

create policy company_settings_insert_admin
on public.company_settings for insert to authenticated
with check ((select private.is_admin()));

create policy company_settings_update_admin
on public.company_settings for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy company_settings_delete_admin
on public.company_settings for delete to authenticated
using ((select private.is_admin()));
