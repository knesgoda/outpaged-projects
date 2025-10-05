-- avatars bucket and policies
select storage.create_bucket('avatars', public => true);

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_write_auth" on storage.objects;
create policy "avatars_write_auth"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

drop policy if exists "avatars_update_auth" on storage.objects;
create policy "avatars_update_auth"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_delete_auth" on storage.objects;
create policy "avatars_delete_auth"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars');

