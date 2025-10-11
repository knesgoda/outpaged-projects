import { supabase } from "@/integrations/supabase/client";

const PROJECT_LIFECYCLE_FUNCTION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-lifecycle`;

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
  }>;
};

export interface ProjectTemplateRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  complexity: string;
  estimatedDuration?: string | null;
  icon?: string | null;
  recommendedModules: string[];
  successMetrics: string[];
  templateData: TemplateManifest;
  usageCount?: number | null;
}

export interface ProjectTemplateSummary extends ProjectTemplateRecord {
  score?: number;
}

export async function listProjectTemplates(): Promise<ProjectTemplateSummary[]> {
  const { data, error } = await supabase
    .from("project_templates")
    .select("id, name, description, category, tags, complexity, estimated_duration, icon, recommended_modules, success_metrics, template_data, usage_count")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: (row.tags ?? []) as string[],
    complexity: row.complexity,
    estimatedDuration: row.estimated_duration ?? null,
    icon: row.icon ?? null,
    recommendedModules: (row.recommended_modules ?? []) as string[],
    successMetrics: (row.success_metrics ?? []) as string[],
    templateData: (row.template_data ?? {}) as TemplateManifest,
    usageCount: row.usage_count ?? 0,
    score: row.usage_count ?? 0,
  }));
}

export async function getProjectTemplate(id: string): Promise<ProjectTemplateRecord | null> {
  const { data, error } = await supabase
    .from("project_templates")
    .select("id, name, description, category, tags, complexity, estimated_duration, icon, recommended_modules, success_metrics, template_data, usage_count")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: (data.tags ?? []) as string[],
    complexity: data.complexity,
    estimatedDuration: data.estimated_duration ?? null,
    icon: data.icon ?? null,
    recommendedModules: (data.recommended_modules ?? []) as string[],
    successMetrics: (data.success_metrics ?? []) as string[],
    templateData: (data.template_data ?? {}) as TemplateManifest,
    usageCount: data.usage_count ?? 0,
  };
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error("Missing Supabase access token");
  }
  return token;
}

export async function applyProjectTemplate(projectId: string, templateId: string) {
  const token = await getAccessToken();
  const response = await fetch(PROJECT_LIFECYCLE_FUNCTION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "apply-template",
      projectId,
      templateId,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to apply template");
  }

  return response.json();
}

export interface TemplateCreationInput {
  name: string;
  description: string;
  category: string;
  icon?: string | null;
  tags?: string[];
  complexity?: string;
  estimated_duration?: string;
  recommended_modules?: string[];
  success_metrics?: string[];
  template_data: TemplateManifest;
}

export async function createProjectTemplate(input: TemplateCreationInput) {
  const { data: user } = await supabase.auth.getUser();
  const createdBy = user?.user?.id ?? null;
  const payload = {
    ...input,
    tags: input.tags ?? [],
    recommended_modules: input.recommended_modules ?? [],
    success_metrics: input.success_metrics ?? [],
    created_by: createdBy,
    is_public: true,
  };

  const { data, error } = await supabase
    .from("project_templates")
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
