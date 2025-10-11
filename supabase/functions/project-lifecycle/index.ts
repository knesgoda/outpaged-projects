import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TemplateManifest = {
  modules?: string[];
  schemes?: {
    permission?: string;
    notification?: string;
    sla?: string;
  };
  fields?: Array<{
    name: string;
    field_type: string;
    options?: string[];
    applies_to?: string[];
    is_required?: boolean;
    is_private?: boolean;
    position?: number;
    formula?: string | null;
    rollup_config?: Record<string, unknown> | null;
  }>;
  workflows?: Array<{
    workflow_template_id: string;
    item_type?: string;
  }>;
  boards?: Array<{
    name: string;
    type?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    filters?: Record<string, unknown>;
    views?: Array<{
      name: string;
      slug?: string;
      description?: string;
      is_default?: boolean;
      position?: number;
      configuration?: Record<string, unknown>;
    }>;
  }>;
  automations?: Array<{
    name: string;
    trigger_type: string;
    trigger_config?: Record<string, unknown>;
    action_type: string;
    action_config?: Record<string, unknown>;
    enabled?: boolean;
  }>;
  starter_items?: Array<{
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    story_points?: number;
    assignee_id?: string;
  }>;
};

type CloneOptions = {
  includeItems?: boolean;
  includeBoards?: boolean;
  includeAutomations?: boolean;
  includeFields?: boolean;
  includeWorkflows?: boolean;
  includeSprints?: boolean;
  moduleOverrides?: string[] | null;
};

type ExportOptions = {
  includeHistory?: boolean;
  includeAutomations?: boolean;
  includeBoards?: boolean;
  includeFields?: boolean;
  includeTasks?: boolean;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);

const normalizeStatus = (status?: string | null) => {
  if (!status) return "todo";
  const candidate = status.toLowerCase();
  const allowed = new Set(["todo", "in_progress", "in_review", "done"]);
  if (allowed.has(candidate)) {
    return candidate;
  }
  if (candidate.includes("progress")) return "in_progress";
  if (candidate.includes("review") || candidate.includes("qa")) return "in_review";
  if (candidate.includes("done") || candidate.includes("complete")) return "done";
  return "todo";
};

const normalizePriority = (priority?: string | null) => {
  if (!priority) return "medium";
  const candidate = priority.toLowerCase();
  const allowed = new Set(["low", "medium", "high", "urgent"]);
  if (allowed.has(candidate)) {
    return candidate;
  }
  if (candidate.includes("crit") || candidate.includes("p1")) return "urgent";
  if (candidate.includes("high") || candidate.includes("p2")) return "high";
  if (candidate.includes("low") || candidate.includes("p4")) return "low";
  return "medium";
};

async function handleApplyTemplate(
  admin: ReturnType<typeof createClient>,
  projectId: string,
  templateId: string,
  userId: string,
) {
  const { data: template, error: templateError } = await admin
    .from("project_templates")
    .select("id, template_data, recommended_modules, schemes:template_data->schemes")
    .eq("id", templateId)
    .maybeSingle();

  if (templateError) {
    throw templateError;
  }
  if (!template) {
    throw new Error("Template not found");
  }

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, owner_id, workspace_id, modules, permission_scheme_id, notification_scheme_id, sla_scheme_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }
  if (!project) {
    throw new Error("Project not found");
  }
  if (project.owner_id !== userId) {
    const { data: membership } = await admin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["admin", "project_manager"].includes((membership as any)?.role ?? "")) {
      throw new Error("User must be a project owner or admin to apply a template");
    }
  }

  const manifest = (template.template_data || {}) as TemplateManifest;

  const modules = manifest.modules ?? template.recommended_modules ?? project.modules ?? [];
  const permissionScheme = manifest.schemes?.permission ?? project.permission_scheme_id ?? null;
  const notificationScheme = manifest.schemes?.notification ?? project.notification_scheme_id ?? null;
  const slaScheme = manifest.schemes?.sla ?? project.sla_scheme_id ?? null;

  await admin
    .from("projects")
    .update({
      template_key: template.id,
      modules,
      permission_scheme_id: permissionScheme,
      notification_scheme_id: notificationScheme,
      sla_scheme_id: slaScheme,
    })
    .eq("id", projectId);

  const summary = {
    fields: 0,
    workflows: 0,
    boards: 0,
    automations: 0,
    starterItems: 0,
  };

  if (manifest.fields?.length) {
    const { data: existingFields, error: fieldsError } = await admin
      .from("project_custom_fields")
      .select("name")
      .eq("project_id", projectId);
    if (fieldsError) throw fieldsError;
    const existingNames = new Set((existingFields ?? []).map((field: any) => field.name));

    for (const field of manifest.fields) {
      if (existingNames.has(field.name)) continue;
      const { error } = await admin.from("project_custom_fields").insert({
        project_id: projectId,
        name: field.name,
        field_type: field.field_type,
        options: field.options ?? [],
        applies_to: field.applies_to ?? ["task"],
        is_required: field.is_required ?? false,
        is_private: field.is_private ?? false,
        position: field.position ?? 0,
        formula: field.formula ?? null,
        rollup_config: field.rollup_config ?? null,
      });
      if (error) throw error;
      summary.fields += 1;
    }
  }

  if (manifest.workflows?.length) {
    for (const workflow of manifest.workflows) {
      const { error } = await admin
        .from("project_workflows")
        .upsert(
          {
            project_id: projectId,
            workflow_template_id: workflow.workflow_template_id,
            item_type: workflow.item_type ?? "task",
            is_active: true,
          },
          { onConflict: "project_id,item_type" },
        );
      if (error) throw error;
      summary.workflows += 1;
    }
  }

  if (manifest.boards?.length) {
    for (const board of manifest.boards) {
      const boardId = crypto.randomUUID();
      const boardType = (board.type ?? "container") as "container" | "query" | "hybrid";
      const { error: boardError } = await admin.from("boards").insert({
        id: boardId,
        workspace_id: project.workspace_id,
        name: board.name,
        description: board.description ?? null,
        type: boardType,
        created_by: userId,
      });
      if (boardError) throw boardError;

      const { error: scopeError } = await admin.from("board_scopes").insert({
        board_id: boardId,
        scope_type: boardType,
        container_id: projectId,
        query_definition: null,
        filters: board.filters ?? {},
        metadata: board.metadata ?? {},
      });
      if (scopeError) throw scopeError;

      if (board.views?.length) {
        let position = 0;
        for (const view of board.views) {
          const slug = view.slug ? slugify(view.slug) : `${slugify(view.name)}-${Date.now()}`;
          const { error: viewError } = await admin.from("board_views").insert({
            board_id: boardId,
            name: view.name,
            slug,
            description: view.description ?? null,
            is_default: view.is_default ?? position === 0,
            position: view.position ?? position,
            configuration: view.configuration ?? {},
          });
          if (viewError) throw viewError;
          position += 1;
        }
      }
      summary.boards += 1;
    }
  }

  if (manifest.automations?.length) {
    for (const automation of manifest.automations) {
      const { error } = await admin.from("automations").insert({
        owner: userId,
        project_id: projectId,
        name: automation.name,
        enabled: automation.enabled ?? true,
        trigger_type: automation.trigger_type,
        trigger_config: automation.trigger_config ?? {},
        action_type: automation.action_type,
        action_config: automation.action_config ?? {},
      });
      if (error) throw error;
      summary.automations += 1;
    }
  }

  if (manifest.starter_items?.length) {
    for (const item of manifest.starter_items) {
      const { error } = await admin.from("tasks").insert({
        project_id: projectId,
        title: item.title,
        description: item.description ?? null,
        status: normalizeStatus(item.status),
        priority: normalizePriority(item.priority),
        reporter_id: userId,
        assignee_id: item.assignee_id ?? null,
        due_date: item.due_date ?? null,
        story_points: item.story_points ?? null,
      });
      if (error) throw error;
      summary.starterItems += 1;
    }
  }

  return summary;
}

async function handleClone(
  admin: ReturnType<typeof createClient>,
  sourceProjectId: string,
  userId: string,
  name?: string,
  code?: string,
  options: CloneOptions = {},
) {
  const { data: source, error: sourceError } = await admin
    .from("projects")
    .select(
      "*, project_workflows:project_workflows(workflow_template_id,item_type), project_custom_fields:project_custom_fields(name,field_type,options,applies_to,is_required,is_private,position,formula,rollup_config), sprints:sprints(*), automations:automations(*), tasks:tasks(*)",
    )
    .eq("id", sourceProjectId)
    .maybeSingle();

  if (sourceError) throw sourceError;
  if (!source) throw new Error("Source project not found");
  if (source.owner_id !== userId) {
    throw new Error("Only project owners can clone a project");
  }

  const cloneName = name?.trim().length ? name.trim() : `${source.name} Copy`;
  const deriveCode = () => {
    if (code?.trim()) return code.trim().toUpperCase().slice(0, 8);
    const letters = cloneName.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${letters}${suffix}`.slice(0, 8);
  };

  const { data: clone, error: cloneError } = await admin
    .from("projects")
    .insert({
      name: cloneName,
      description: source.description,
      status: "planning",
      start_date: source.start_date,
      end_date: source.end_date,
      owner_id: userId,
      workspace_id: source.workspace_id,
      template_key: source.template_key,
      modules: options.moduleOverrides ?? source.modules ?? null,
      permission_scheme_id: source.permission_scheme_id,
      notification_scheme_id: source.notification_scheme_id,
      sla_scheme_id: source.sla_scheme_id,
      code: deriveCode(),
      calendar_id: source.calendar_id,
      timezone: source.timezone,
      import_strategy: source.import_strategy,
      import_sources: source.import_sources,
      lifecycle: source.lifecycle,
      field_configuration: source.field_configuration,
      workflow_ids: source.workflow_ids,
      screen_ids: source.screen_ids,
      component_catalog: source.component_catalog,
      version_streams: source.version_streams,
      automation_rules: source.automation_rules,
      integration_configs: source.integration_configs,
      default_views: source.default_views,
      dashboard_ids: source.dashboard_ids,
      archival_policy: source.archival_policy,
    })
    .select()
    .single();

  if (cloneError) throw cloneError;

  const cloneId = clone.id as string;
  const summary = {
    fields: 0,
    workflows: 0,
    boards: 0,
    automations: 0,
    tasks: 0,
    sprints: 0,
  };

  if (options.includeFields !== false) {
    for (const field of source.project_custom_fields ?? []) {
      const { error } = await admin.from("project_custom_fields").insert({
        project_id: cloneId,
        name: field.name,
        field_type: field.field_type,
        options: field.options,
        applies_to: field.applies_to,
        is_required: field.is_required,
        is_private: field.is_private,
        position: field.position,
        formula: field.formula,
        rollup_config: field.rollup_config,
      });
      if (error) throw error;
      summary.fields += 1;
    }
  }

  if (options.includeWorkflows !== false) {
    for (const workflow of source.project_workflows ?? []) {
      const { error } = await admin
        .from("project_workflows")
        .upsert(
          {
            project_id: cloneId,
            workflow_template_id: workflow.workflow_template_id,
            item_type: workflow.item_type,
            is_active: true,
          },
          { onConflict: "project_id,item_type" },
        );
      if (error) throw error;
      summary.workflows += 1;
    }
  }

  const sprintIdMap = new Map<string, string>();
  if (options.includeSprints) {
    for (const sprint of source.sprints ?? []) {
      const newId = crypto.randomUUID();
      sprintIdMap.set(sprint.id, newId);
      const { error } = await admin.from("sprints").insert({
        id: newId,
        name: sprint.name,
        description: sprint.description,
        project_id: cloneId,
        status: sprint.status,
        start_date: sprint.start_date,
        end_date: sprint.end_date,
      });
      if (error) throw error;
      summary.sprints += 1;
    }
  }

  if (options.includeAutomations !== false) {
    for (const automation of source.automations ?? []) {
      const { error } = await admin.from("automations").insert({
        owner: userId,
        project_id: cloneId,
        name: automation.name,
        enabled: automation.enabled,
        trigger_type: automation.trigger_type,
        trigger_config: automation.trigger_config,
        action_type: automation.action_type,
        action_config: automation.action_config,
      });
      if (error) throw error;
      summary.automations += 1;
    }
  }

  if (options.includeBoards !== false) {
    const { data: boardScopes, error: boardScopeError } = await admin
      .from("board_scopes")
      .select("*, board:boards(*), views:board_views(*)")
      .eq("container_id", sourceProjectId);
    if (boardScopeError) throw boardScopeError;

    for (const scope of boardScopes ?? []) {
      const newBoardId = crypto.randomUUID();
      const board = (scope as any).board;
      const { error: newBoardError } = await admin.from("boards").insert({
        id: newBoardId,
        workspace_id: clone.workspace_id,
        name: board.name,
        description: board.description,
        type: board.type,
        created_by: userId,
      });
      if (newBoardError) throw newBoardError;

      const { error: newScopeError } = await admin.from("board_scopes").insert({
        board_id: newBoardId,
        scope_type: scope.scope_type,
        container_id: cloneId,
        query_definition: scope.query_definition,
        filters: scope.filters,
        metadata: scope.metadata,
      });
      if (newScopeError) throw newScopeError;

      for (const view of (scope as any).views ?? []) {
        const slug = `${slugify(view.slug ?? view.name)}-${Date.now()}`;
        const { error: viewInsertError } = await admin.from("board_views").insert({
          board_id: newBoardId,
          name: view.name,
          slug,
          description: view.description,
          is_default: view.is_default,
          position: view.position,
          configuration: view.configuration,
        });
        if (viewInsertError) throw viewInsertError;
      }
      summary.boards += 1;
    }
  }

  if (options.includeItems) {
    for (const task of source.tasks ?? []) {
      const { error } = await admin.from("tasks").insert({
        project_id: cloneId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        reporter_id: userId,
        assignee_id: task.assignee_id,
        sprint_id: task.sprint_id ? sprintIdMap.get(task.sprint_id) ?? null : null,
        story_points: task.story_points,
        due_date: task.due_date,
      });
      if (error) throw error;
      summary.tasks += 1;
    }
  }

  return { projectId: cloneId, summary };
}

function convertToCsv<T extends Record<string, unknown>>(rows: T[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
    }
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes("\"")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  const headerRow = headers.join(",");
  const dataRows = rows.map(row => headers.map(key => escape(row[key])).join(","));
  return [headerRow, ...dataRows].join("\n");
}

async function handleExport(
  admin: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
  options: ExportOptions = {},
) {
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("*, project_members!left(user_id, role)")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error("Project not found");
  if (project.owner_id !== userId) {
    throw new Error("Only owners can export a project bundle");
  }

  const [fieldsRes, workflowsRes, boardsRes, automationsRes, tasksRes, sprintsRes] = await Promise.all([
    options.includeFields === false
      ? Promise.resolve({ data: [] })
      : admin.from("project_custom_fields").select("*").eq("project_id", projectId),
    admin.from("project_workflows").select("*").eq("project_id", projectId),
    options.includeBoards === false
      ? Promise.resolve({ data: [] })
      : admin
          .from("board_scopes")
          .select("*, boards(*), board_views(*)")
          .eq("container_id", projectId),
    options.includeAutomations === false
      ? Promise.resolve({ data: [] })
      : admin.from("automations").select("*").eq("project_id", projectId),
    options.includeTasks === false
      ? Promise.resolve({ data: [] })
      : admin.from("tasks").select("*").eq("project_id", projectId),
    admin.from("sprints").select("*").eq("project_id", projectId),
  ]);

  const bundle = {
    project,
    fields: fieldsRes.data ?? [],
    workflows: workflowsRes.data ?? [],
    boards: boardsRes.data ?? [],
    automations: automationsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    sprints: sprintsRes.data ?? [],
  };

  const files = {
    project: JSON.stringify(project, null, 2),
    fieldsCsv: convertToCsv(bundle.fields as any[]),
    tasksCsv: convertToCsv(bundle.tasks as any[]),
    automationsCsv: convertToCsv(bundle.automations as any[]),
  };

  return { bundle, files };
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "apply-template") {
      const summary = await handleApplyTemplate(adminClient, body.projectId, body.templateId, user.id);
      return new Response(
        JSON.stringify({ success: true, summary }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (action === "clone") {
      const result = await handleClone(
        adminClient,
        body.sourceProjectId,
        user.id,
        body.name,
        body.code,
        body.options ?? {},
      );
      return new Response(
        JSON.stringify({ success: true, projectId: result.projectId, summary: result.summary }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (action === "export") {
      const result = await handleExport(adminClient, body.projectId, user.id, body.options ?? {});
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unsupported action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error) {
    console.error("project-lifecycle error", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
