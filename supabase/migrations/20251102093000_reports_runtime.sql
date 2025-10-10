-- Support executing reports and seeding demo analytics content
create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  run_at timestamptz not null default now(),
  parameters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb
);

alter table public.report_runs enable row level security;

create policy if not exists "report_runs_read" on public.report_runs
for select to authenticated
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_runs.report_id
      and (
        r.owner = auth.uid()
        or (
          r.project_id is not null and r.project_id in (
            select id from public.projects where owner_id = auth.uid()
            union
            select project_id from public.project_members where user_id = auth.uid()
          )
        )
      )
  )
);

create policy if not exists "report_runs_write" on public.report_runs
for insert to authenticated
with check (
  exists (
    select 1
    from public.reports r
    where r.id = report_runs.report_id
      and (
        r.owner = auth.uid()
        or (
          r.project_id is not null and r.project_id in (
            select id from public.projects where owner_id = auth.uid()
            union
            select project_id from public.project_members where user_id = auth.uid()
          )
        )
      )
  )
);

create index if not exists report_runs_report_idx on public.report_runs(report_id, run_at desc);

create or replace function public.run_report_config(
  report_config jsonb,
  run_params jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source text := coalesce(report_config->>'source', 'tasks');
  limit_value integer := coalesce(nullif(report_config->>'limit', '')::integer, 50);
  project_filter uuid := null;
  current_user_id uuid := auth.uid();
  result jsonb;
begin
  if run_params ? 'limit' then
    limit_value := coalesce((run_params->>'limit')::integer, limit_value);
  end if;
  if limit_value is null or limit_value < 1 then
    limit_value := 50;
  end if;

  if report_config ? 'projectId' then
    project_filter := nullif(report_config->>'projectId', '')::uuid;
  end if;
  if run_params ? 'projectId' then
    project_filter := nullif(run_params->>'projectId', '')::uuid;
  end if;

  if source = 'tasks' then
    with accessible_projects as (
      select id
      from public.projects p
      where (project_filter is null or p.id = project_filter)
        and (
          current_user_id is null
          or p.owner_id = current_user_id
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = current_user_id
          )
        )
    ), base as (
      select
        t.id,
        t.title,
        t.status::text as status,
        t.priority::text as priority,
        t.story_points,
        t.due_date,
        t.updated_at,
        t.ticket_number,
        p.name as project_name,
        assignee.full_name as assignee_name
      from public.tasks t
      join public.projects p on p.id = t.project_id
      left join public.profiles assignee on assignee.id = t.assignee_id
      where (
        project_filter is null and (
          current_user_id is null
          or p.owner_id = current_user_id
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = current_user_id
          )
        )
      )
      or t.project_id in (select id from accessible_projects)
    ), limited as (
      select * from base order by updated_at desc limit limit_value
    ), status_counts as (
      select status, count(*)::int as count from base group by status
    ), priority_counts as (
      select priority, count(*)::int as count from base group by priority
    )
    select jsonb_build_object(
      'columns', jsonb_build_array(
        jsonb_build_object('key','title','label','Title','type','string'),
        jsonb_build_object('key','status','label','Status','type','string'),
        jsonb_build_object('key','priority','label','Priority','type','string'),
        jsonb_build_object('key','story_points','label','Story Points','type','number'),
        jsonb_build_object('key','due_date','label','Due','type','date'),
        jsonb_build_object('key','project','label','Project','type','string'),
        jsonb_build_object('key','assignee','label','Assignee','type','string'),
        jsonb_build_object('key','ticket_number','label','Ticket','type','number')
      ),
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'title', limited.title,
        'status', limited.status,
        'priority', limited.priority,
        'story_points', limited.story_points,
        'due_date', limited.due_date,
        'project', limited.project_name,
        'assignee', limited.assignee_name,
        'ticket_number', limited.ticket_number
      )), '[]'::jsonb),
      'meta', jsonb_build_object(
        'total', (select count(*) from base),
        'groupCounts', jsonb_strip_nulls(jsonb_build_object(
          'status', coalesce((select jsonb_object_agg(status, count) filter (where status is not null) from status_counts), '{}'::jsonb),
          'priority', coalesce((select jsonb_object_agg(priority, count) filter (where priority is not null) from priority_counts), '{}'::jsonb)
        ))
      )
    )
    into result
    from limited;
  elsif source = 'task_status_breakdown' then
    with accessible_projects as (
      select id
      from public.projects p
      where (project_filter is null or p.id = project_filter)
        and (
          current_user_id is null
          or p.owner_id = current_user_id
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = current_user_id
          )
        )
    ), base as (
      select
        t.status::text as status
      from public.tasks t
      join public.projects p on p.id = t.project_id
      where (
        project_filter is null and (
          current_user_id is null
          or p.owner_id = current_user_id
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.user_id = current_user_id
          )
        )
      )
      or t.project_id in (select id from accessible_projects)
    ), grouped as (
      select status, count(*)::int as tasks from base group by status order by status
    )
    select jsonb_build_object(
      'columns', jsonb_build_array(
        jsonb_build_object('key','status','label','Status','type','string'),
        jsonb_build_object('key','tasks','label','Tasks','type','number')
      ),
      'rows', coalesce(jsonb_agg(jsonb_build_object('status', grouped.status, 'tasks', grouped.tasks) order by grouped.status), '[]'::jsonb),
      'meta', jsonb_build_object('total', coalesce((select sum(tasks) from grouped), 0))
    )
    into result
    from grouped;
  else
    raise exception 'Unsupported report source: %', source using errcode = 'P0001';
  end if;

  if result is null then
    result := jsonb_build_object(
      'columns', '[]'::jsonb,
      'rows', '[]'::jsonb,
      'meta', jsonb_build_object('total', 0)
    );
  end if;

  return result;
end;
$$;

create or replace function public.execute_report(
  report_id uuid,
  run_params jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report_record public.reports%rowtype;
  current_user_id uuid := auth.uid();
  effective_params jsonb := coalesce(run_params, '{}'::jsonb);
  result jsonb;
begin
  select * into report_record from public.reports where id = report_id;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if current_user_id is null then
    current_user_id := report_record.owner;
  end if;

  if report_record.owner <> current_user_id then
    if report_record.project_id is null then
      raise exception 'You do not have access to this report.' using errcode = '42501';
    end if;

    perform 1
    from public.projects p
    where p.id = report_record.project_id
      and (
        p.owner_id = current_user_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id and pm.user_id = current_user_id
        )
      );
    if not found then
      raise exception 'You do not have access to this report.' using errcode = '42501';
    end if;
  end if;

  if report_record.project_id is not null and not (effective_params ? 'projectId') then
    effective_params := jsonb_set(effective_params, '{projectId}', to_jsonb(report_record.project_id));
  end if;

  result := public.run_report_config(report_record.config, effective_params);

  insert into public.report_runs(report_id, parameters, columns, rows, meta)
  values (
    report_id,
    effective_params,
    coalesce(result->'columns', '[]'::jsonb),
    coalesce(result->'rows', '[]'::jsonb),
    coalesce(result->'meta', '{}'::jsonb)
  );

  return result;
end;
$$;

do $$
declare
  owner_id uuid;
  project_id uuid;
  tasks_report_id uuid;
  status_report_id uuid;
begin
  select id into owner_id from auth.users limit 1;
  if owner_id is null then
    return;
  end if;

  select id into project_id from public.projects where name = 'Analytics Demo';
  if project_id is null then
    insert into public.projects (owner_id, name, description, status, created_at, updated_at)
    values (
      owner_id,
      'Analytics Demo',
      'Demo project used to showcase analytics dashboards.',
      'active',
      now(),
      now()
    )
    returning id into project_id;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (project_id, owner_id, 'admin')
  on conflict (project_id, user_id) do nothing;

  if not exists (select 1 from public.tasks where project_id = project_id) then
    insert into public.tasks (
      title,
      description,
      status,
      priority,
      project_id,
      reporter_id,
      assignee_id,
      story_points,
      due_date,
      updated_at
    )
    values
      (
        'Finalize onboarding tour',
        'Complete the onboarding walkthrough for new users.',
        'in_progress',
        'high',
        project_id,
        owner_id,
        owner_id,
        5,
        now() + interval '7 days',
        now()
      ),
      (
        'Prepare launch checklist',
        'Ensure all launch activities are tracked.',
        'todo',
        'medium',
        project_id,
        owner_id,
        null,
        3,
        now() + interval '14 days',
        now()
      ),
      (
        'Review sprint metrics',
        'Analyze the latest sprint burndown and velocity.',
        'in_review',
        'high',
        project_id,
        owner_id,
        owner_id,
        8,
        now() + interval '5 days',
        now()
      ),
      (
        'Retrospective updates',
        'Document action items from the last retrospective.',
        'done',
        'low',
        project_id,
        owner_id,
        owner_id,
        2,
        now() - interval '2 days',
        now()
      );
  end if;

  select id into tasks_report_id
  from public.reports
  where owner = owner_id and name = 'Active Tasks Overview'
  limit 1;

  if tasks_report_id is null then
    insert into public.reports (owner, project_id, name, description, config)
    values (
      owner_id,
      project_id,
      'Active Tasks Overview',
      'Shows the latest tasks with key delivery details.',
      jsonb_build_object('source','tasks','limit',25,'projectId', project_id)
    )
    returning id into tasks_report_id;
  end if;

  select id into status_report_id
  from public.reports
  where owner = owner_id and name = 'Task Status Summary'
  limit 1;

  if status_report_id is null then
    insert into public.reports (owner, project_id, name, description, config)
    values (
      owner_id,
      project_id,
      'Task Status Summary',
      'Summarizes tasks by status for quick health checks.',
      jsonb_build_object('source','task_status_breakdown','projectId', project_id)
    )
    returning id into status_report_id;
  end if;

  if tasks_report_id is not null and not exists (select 1 from public.report_runs where report_id = tasks_report_id) then
    insert into public.report_runs (report_id, columns, rows, meta)
    values (
      tasks_report_id,
      jsonb_build_array(
        jsonb_build_object('key','title','label','Title','type','string'),
        jsonb_build_object('key','status','label','Status','type','string'),
        jsonb_build_object('key','priority','label','Priority','type','string'),
        jsonb_build_object('key','project','label','Project','type','string')
      ),
      jsonb_build_array(
        jsonb_build_object('title','Finalize onboarding tour','status','in_progress','priority','high','project','Analytics Demo'),
        jsonb_build_object('title','Prepare launch checklist','status','todo','priority','medium','project','Analytics Demo'),
        jsonb_build_object('title','Review sprint metrics','status','in_review','priority','high','project','Analytics Demo')
      ),
      jsonb_build_object(
        'total', 3,
        'groupCounts', jsonb_build_object(
          'status', jsonb_build_object('in_progress',1,'todo',1,'in_review',1),
          'priority', jsonb_build_object('high',2,'medium',1)
        )
      )
    );
  end if;

  if status_report_id is not null and not exists (select 1 from public.report_runs where report_id = status_report_id) then
    insert into public.report_runs (report_id, columns, rows, meta)
    values (
      status_report_id,
      jsonb_build_array(
        jsonb_build_object('key','status','label','Status','type','string'),
        jsonb_build_object('key','tasks','label','Tasks','type','number')
      ),
      jsonb_build_array(
        jsonb_build_object('status','todo','tasks',1),
        jsonb_build_object('status','in_progress','tasks',1),
        jsonb_build_object('status','in_review','tasks',1),
        jsonb_build_object('status','done','tasks',1)
      ),
      jsonb_build_object('total', 4)
    );
  end if;
end;
$$;
