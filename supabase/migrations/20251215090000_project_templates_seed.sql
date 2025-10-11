-- Ensure project_templates table has required columns and seed rich template manifests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'template_data'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN template_data JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'complexity'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN complexity TEXT DEFAULT 'intermediate';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN estimated_duration TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN icon TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'recommended_modules'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN recommended_modules TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'success_metrics'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN success_metrics TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN is_public BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'usage_count'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN usage_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN created_at TIMESTAMPTZ DEFAULT timezone('utc', now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_templates' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.project_templates
      ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END$$;

-- Create reusable workflow templates with fixed identifiers if they do not already exist
INSERT INTO public.workflow_templates (id, name, description, category, is_default, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Agile Delivery Core', 'Backlog to done workflow for software delivery teams.', 'software', true, true),
  ('22222222-2222-2222-2222-222222222222', 'ITSM Incident Flow', 'Service desk triage with approvals and resolution.', 'service', true, true),
  ('33333333-3333-3333-3333-333333333333', 'Portfolio Program Flow', 'Stage-gated program management workflow.', 'business', true, true)
ON CONFLICT (id) DO NOTHING;

-- Helper to upsert workflow states
DO $$
DECLARE
  wf record;
BEGIN
  FOR wf IN SELECT * FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Backlog', 'Items awaiting prioritisation', 'todo', 0, '#94a3b8'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Ready', 'Committed into upcoming sprint', 'todo', 1, '#6366f1'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'In Progress', 'Actively being worked', 'in_progress', 2, '#0ea5e9'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Review', 'Awaiting QA / code review', 'in_review', 3, '#f97316'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Done', 'Meets Definition of Done', 'done', 4, '#22c55e'),

    ('22222222-2222-2222-2222-222222222222'::uuid, 'Intake', 'New requests entering the desk', 'todo', 0, '#38bdf8'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Triage', 'Categorisation and routing', 'in_progress', 1, '#fb7185'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'In Progress', 'Agent actively resolving', 'in_progress', 2, '#facc15'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Waiting on Customer', 'Awaiting customer response', 'on_hold', 3, '#f97316'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Resolved', 'Solution delivered, pending confirmation', 'done', 4, '#22c55e'),

    ('33333333-3333-3333-3333-333333333333'::uuid, 'Discover', 'Explore problem framing', 'todo', 0, '#f472b6'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Plan', 'Validate scope and investment', 'in_progress', 1, '#60a5fa'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Execute', 'Delivery underway across teams', 'in_progress', 2, '#34d399'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Stabilise', 'Hardening, release readiness', 'in_review', 3, '#fbbf24'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Complete', 'Signed off and closed', 'done', 4, '#14b8a6')
  ) AS t(template_id, state_name, description, category, position, color)
  LOOP
    INSERT INTO public.workflow_states (workflow_template_id, name, description, state_category, position, color)
    VALUES (wf.template_id, wf.state_name, wf.description, wf.category, wf.position, wf.color)
    ON CONFLICT DO NOTHING;
  END LOOP;
END$$;

-- Ensure transitions exist for each workflow template
DO $$
DECLARE
  template_id uuid;
  from_name text;
  to_name text;
  from_state uuid;
  to_state uuid;
BEGIN
  FOR template_id, from_name, to_name IN SELECT * FROM (VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Backlog', 'Ready'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Ready', 'In Progress'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'In Progress', 'Review'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Review', 'Done'),
    ('11111111-1111-1111-1111-111111111111'::uuid, 'Review', 'In Progress'),

    ('22222222-2222-2222-2222-222222222222'::uuid, 'Intake', 'Triage'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Triage', 'In Progress'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'In Progress', 'Waiting on Customer'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Waiting on Customer', 'In Progress'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'In Progress', 'Resolved'),

    ('33333333-3333-3333-3333-333333333333'::uuid, 'Discover', 'Plan'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Plan', 'Execute'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Execute', 'Stabilise'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Stabilise', 'Complete')
  ) AS transitions(template_id, from_state_name, to_state_name)
  LOOP
    SELECT id INTO from_state FROM public.workflow_states
    WHERE workflow_template_id = template_id AND name = from_name
    LIMIT 1;

    SELECT id INTO to_state FROM public.workflow_states
    WHERE workflow_template_id = template_id AND name = to_name
    LIMIT 1;

    IF from_state IS NOT NULL AND to_state IS NOT NULL THEN
      INSERT INTO public.workflow_transitions (workflow_template_id, from_state_id, to_state_id)
      VALUES (template_id, from_state, to_state)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END$$;

-- Clear existing placeholder templates so the gallery reflects the authoritative manifests
DELETE FROM public.project_templates;

-- Seed gallery templates with structured manifest data
WITH first_user AS (
  SELECT id FROM auth.users ORDER BY created_at LIMIT 1
),
base_templates AS (
  SELECT * FROM (VALUES
    (
      '55555555-1111-1111-1111-111111111111',
      'Agile Delivery Launchpad',
      'Sprint-ready Scrum & Kanban hybrid with governance rails.',
      'software',
      ARRAY['software', 'engineering', 'scrum'],
      'intermediate',
      '6-8 weeks',
      'rocket',
      ARRAY['backlog', 'board', 'release', 'automations', 'timeline'],
      ARRAY['Velocity trending', 'Sprint predictability', 'Escaped defects'],
      '{
        "modules": ["backlog", "board", "release", "automations", "timeline"],
        "schemes": {"permission": "standard_delivery", "notification": "iterative_updates", "sla": "team_owned"},
        "fields": [
          {"name": "Customer Impact", "field_type": "select", "options": ["Low", "Medium", "High", "Critical"], "applies_to": ["task", "bug"], "is_required": true, "position": 0},
          {"name": "Story Points", "field_type": "story_points", "applies_to": ["story", "task"], "position": 1},
          {"name": "Release Train", "field_type": "select", "options": ["Train A", "Train B", "Train C"], "applies_to": ["task", "story"], "position": 2}
        ],
        "workflows": [
          {"workflow_template_id": "11111111-1111-1111-1111-111111111111", "item_type": "task"},
          {"workflow_template_id": "11111111-1111-1111-1111-111111111111", "item_type": "bug"}
        ],
        "boards": [
          {
            "name": "Sprint Delivery",
            "type": "container",
            "description": "Execution board grouped by sprint",
            "metadata": {"columns": ["Backlog", "Ready", "In Progress", "Review", "Done"], "swimlanes": ["Assignee", "Epic"]},
            "filters": {"status": ["todo", "in_progress", "in_review", "done"]},
            "views": [
              {"name": "Current Sprint", "slug": "current-sprint", "is_default": true, "position": 0, "configuration": {"columns": ["Backlog", "Ready", "In Progress", "Review", "Done"]}},
              {"name": "Release Plan", "slug": "release-plan", "position": 1, "configuration": {"groupBy": "Release Train", "showTimeline": true}}
            ]
          }
        ],
        "automations": [
          {"name": "Escalate Critical Bugs", "trigger_type": "field_changed", "trigger_config": {"field": "priority", "value": "urgent"}, "action_type": "notify_channel", "action_config": {"channel": "#incidents", "template": "Critical bug escalated"}},
          {"name": "Move to Ready on Groom", "trigger_type": "status_changed", "trigger_config": {"from": "Backlog", "to": "Ready"}, "action_type": "update_field", "action_config": {"field": "Customer Impact", "value": "Medium"}}
        ],
        "starter_items": [
          {"title": "Establish Sprint 1 Rituals", "description": "Schedule planning, standup, and retro ceremonies.", "status": "todo", "priority": "medium"},
          {"title": "Baseline Release Plan", "description": "Draft scope for Release Train Alpha.", "status": "in_progress", "priority": "high"}
        ]
      }'::jsonb
    ),
    (
      '55555555-2222-2222-2222-222222222222',
      'IT Service Command Center',
      'Incident + request intake with SLAs, queues, and post-mortems.',
      'service',
      ARRAY['service desk', 'support', 'itil'],
      'advanced',
      '4-6 weeks',
      'life-buoy',
      ARRAY['requests', 'knowledge', 'sla', 'automations', 'calendar'],
      ARRAY['MTTR', 'SLA attainment', 'Ticket deflection rate'],
      '{
        "modules": ["requests", "knowledge", "sla", "automations", "calendar"],
        "schemes": {"permission": "support_desk", "notification": "major_incident", "sla": "24x7_premium"},
        "fields": [
          {"name": "Impact", "field_type": "select", "options": ["Single User", "Department", "Company"], "applies_to": ["incident", "service_request"], "is_required": true, "position": 0},
          {"name": "Urgency", "field_type": "select", "options": ["Low", "Moderate", "High", "Critical"], "applies_to": ["incident", "change"], "position": 1},
          {"name": "Service", "field_type": "select", "options": ["Network", "Workspace", "Identity", "Devices"], "applies_to": ["incident", "service_request"], "position": 2}
        ],
        "workflows": [
          {"workflow_template_id": "22222222-2222-2222-2222-222222222222", "item_type": "incident"},
          {"workflow_template_id": "22222222-2222-2222-2222-222222222222", "item_type": "service_request"}
        ],
        "boards": [
          {
            "name": "Operations Command",
            "type": "container",
            "description": "Incident queues by severity",
            "metadata": {"queues": ["P1", "P2", "P3"], "showSLABreach": true},
            "filters": {"status": ["todo", "in_progress", "in_review"], "priority": ["high", "urgent"]},
            "views": [
              {"name": "Live Incidents", "slug": "live-incidents", "is_default": true, "position": 0, "configuration": {"columns": ["Intake", "Triage", "In Progress", "Waiting on Customer", "Resolved"], "showSLA": true}},
              {"name": "Request Backlog", "slug": "request-backlog", "position": 1, "configuration": {"groupBy": "Service", "showAging": true}}
            ]
          }
        ],
        "automations": [
          {"name": "Page On-Call for P1", "trigger_type": "field_changed", "trigger_config": {"field": "Impact", "value": "Company"}, "action_type": "notify_channel", "action_config": {"channel": "#on-call", "template": "Major incident declared"}},
          {"name": "Auto-acknowledge Tickets", "trigger_type": "item_created", "trigger_config": {"type": "service_request"}, "action_type": "send_email", "action_config": {"template": "acknowledgement", "from": "support@example.com"}}
        ],
        "starter_items": [
          {"title": "Enable PagerDuty sync", "description": "Configure webhook to auto-create incidents.", "status": "todo", "priority": "high"},
          {"title": "Publish password reset SOP", "description": "Add knowledge base article.", "status": "in_progress", "priority": "medium"}
        ]
      }'::jsonb
    ),
    (
      '55555555-3333-3333-3333-333333333333',
      'Strategic Program Blueprint',
      'Cross-functional program with roadmap, risks, and reporting.',
      'business',
      ARRAY['portfolio', 'executive', 'program'],
      'intermediate',
      'Quarterly cadence',
      'sitemap',
      ARRAY['timeline', 'dashboards', 'goals', 'automations', 'docs'],
      ARRAY['Milestone adherence', 'Budget burn vs plan', 'Risk mitigation velocity'],
      '{
        "modules": ["timeline", "dashboards", "goals", "automations", "docs"],
        "schemes": {"permission": "executive_program", "notification": "stakeholder_digest", "sla": "milestone_commitments"},
        "fields": [
          {"name": "Workstream", "field_type": "select", "options": ["Product", "Marketing", "Enablement", "Operations"], "applies_to": ["task", "epic"], "position": 0},
          {"name": "Risk Level", "field_type": "select", "options": ["Low", "Moderate", "High"], "applies_to": ["risk", "task"], "position": 1},
          {"name": "Budget", "field_type": "currency", "applies_to": ["task", "epic"], "position": 2}
        ],
        "workflows": [
          {"workflow_template_id": "33333333-3333-3333-3333-333333333333", "item_type": "epic"},
          {"workflow_template_id": "33333333-3333-3333-3333-333333333333", "item_type": "task"}
        ],
        "boards": [
          {
            "name": "Program Increment",
            "type": "container",
            "description": "Quarterly roadmap view",
            "metadata": {"showTimeline": true, "timeframe": "quarter"},
            "filters": {"status": ["todo", "in_progress", "in_review", "done"]},
            "views": [
              {"name": "Roadmap", "slug": "roadmap", "is_default": true, "position": 0, "configuration": {"view": "timeline", "groupBy": "Workstream"}},
              {"name": "Risk Register", "slug": "risk-register", "position": 1, "configuration": {"view": "table", "columns": ["Workstream", "Risk Level", "Owner"]}}
            ]
          }
        ],
        "automations": [
          {"name": "Publish Friday Digest", "trigger_type": "schedule", "trigger_config": {"day": "friday", "time": "16:00"}, "action_type": "send_email", "action_config": {"template": "weekly_digest", "recipients": "executive@company.com"}},
          {"name": "Flag High Risks", "trigger_type": "field_changed", "trigger_config": {"field": "Risk Level", "value": "High"}, "action_type": "create_task", "action_config": {"template": "Mitigation plan"}}
        ],
        "starter_items": [
          {"title": "Kick-off Steering Committee", "description": "Confirm charter and cadence with sponsors.", "status": "todo", "priority": "medium"},
          {"title": "Assemble Program Kanban", "description": "Align workstreams and dependencies.", "status": "in_progress", "priority": "medium"}
        ]
      }'::jsonb
    )
  ) AS t(id, name, description, category, tags, complexity, duration, icon, modules, metrics, manifest)
)
INSERT INTO public.project_templates (id, name, description, category, tags, complexity, estimated_duration, icon, recommended_modules, success_metrics, template_data, created_at, updated_at, is_public, usage_count, created_by)
SELECT
  base.id,
  base.name,
  base.description,
  base.category,
  base.tags,
  base.complexity,
  base.duration,
  base.icon,
  base.modules,
  base.metrics,
  base.manifest,
  timezone('utc', now()),
  timezone('utc', now()),
  true,
  0,
  first_user.id
FROM base_templates base, first_user
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  complexity = EXCLUDED.complexity,
  estimated_duration = EXCLUDED.estimated_duration,
  icon = EXCLUDED.icon,
  recommended_modules = EXCLUDED.recommended_modules,
  success_metrics = EXCLUDED.success_metrics,
  template_data = EXCLUDED.template_data,
  updated_at = timezone('utc', now());
