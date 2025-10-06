select storage.create_bucket('help', public => true);

drop policy if exists "help_bucket_read_public" on storage.objects;
create policy "help_bucket_read_public" on storage.objects
for select to public
using (bucket_id = 'help');

drop policy if exists "help_bucket_write_auth" on storage.objects;
create policy "help_bucket_write_auth" on storage.objects
for insert to authenticated
with check (bucket_id = 'help');

drop policy if exists "help_bucket_update_auth" on storage.objects;
create policy "help_bucket_update_auth" on storage.objects
for update to authenticated
using (bucket_id = 'help');

drop policy if exists "help_bucket_delete_auth" on storage.objects;
create policy "help_bucket_delete_auth" on storage.objects
for delete to authenticated
using (bucket_id = 'help');
