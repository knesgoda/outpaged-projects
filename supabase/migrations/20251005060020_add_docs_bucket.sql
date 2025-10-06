-- Storage bucket for doc images
select storage.create_bucket('docs', public => true);

create policy if not exists "docs_bucket_read_public" on storage.objects
for select to public
using (bucket_id = 'docs');

create policy if not exists "docs_bucket_write_auth" on storage.objects
for insert to authenticated
with check (bucket_id = 'docs');

create policy if not exists "docs_bucket_update_auth" on storage.objects
for update to authenticated
using (bucket_id = 'docs');

create policy if not exists "docs_bucket_delete_auth" on storage.objects
for delete to authenticated
using (bucket_id = 'docs');
