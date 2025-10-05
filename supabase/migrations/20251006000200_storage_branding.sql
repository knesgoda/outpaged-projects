-- branding bucket and policies
select storage.create_bucket('branding', public => true);

drop policy if exists "branding_read_public" on storage.objects;
create policy "branding_read_public"
on storage.objects for select
to public
using (bucket_id = 'branding');

drop policy if exists "branding_write_auth" on storage.objects;
create policy "branding_write_auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'branding');

drop policy if exists "branding_update_auth" on storage.objects;
create policy "branding_update_auth"
on storage.objects for update
to authenticated
using (bucket_id = 'branding');

drop policy if exists "branding_delete_auth" on storage.objects;
create policy "branding_delete_auth"
on storage.objects for delete
to authenticated
using (bucket_id = 'branding');

