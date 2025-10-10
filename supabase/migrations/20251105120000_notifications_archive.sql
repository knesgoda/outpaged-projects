-- Add archived_at tracking to notifications and ensure RLS policy exists
alter table public.notifications
  add column if not exists archived_at timestamptz;

-- Refresh the compact self-serve RLS policy to cover the new column
drop policy if exists "notifications_self_rw" on public.notifications;
create policy "notifications_self_rw" on public.notifications
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
