-- Audit log storage
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create policy "audit_admin_read" on public.audit_logs
for select to authenticated using (
  exists (
    select 1
    from public.workspace_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin','manager')
  )
);

create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
