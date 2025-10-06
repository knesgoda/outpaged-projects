-- Storage buckets for branding and avatars
select storage.create_bucket('branding', public => true);
select storage.create_bucket('avatars', public => true);

create policy "branding_read_public" on storage.objects
for select to public using (bucket_id = 'branding');
create policy "branding_write_auth" on storage.objects
for insert to authenticated with check (bucket_id = 'branding');
create policy "branding_update_auth" on storage.objects
for update to authenticated using (bucket_id = 'branding');
create policy "branding_delete_auth" on storage.objects
for delete to authenticated using (bucket_id = 'branding');

create policy "avatars_read_public" on storage.objects
for select to public using (bucket_id = 'avatars');
create policy "avatars_write_auth" on storage.objects
for insert to authenticated with check (bucket_id = 'avatars');
create policy "avatars_update_auth" on storage.objects
for update to authenticated using (bucket_id = 'avatars');
create policy "avatars_delete_auth" on storage.objects
for delete to authenticated using (bucket_id = 'avatars');
