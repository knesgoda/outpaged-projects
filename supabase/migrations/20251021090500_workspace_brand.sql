-- 03_workspace_settings.sql
alter table public.workspace_settings
  add column if not exists brand_name text;

create or replace function public.handle_workspace_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_workspace_settings_updated_at on public.workspace_settings;
create trigger trg_workspace_settings_updated_at
  before update on public.workspace_settings
  for each row
  execute function public.handle_workspace_settings_updated_at();
