import { supabase } from "@/integrations/supabase/client";

const IMPORT_JIRA_FUNCTION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-jira`;

async function getAuthToken() {
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

export interface ImportMapping {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  storyPoints?: number;
  assigneeId?: string | null;
}

export interface ImportItem {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  storyPoints?: number;
  assigneeId?: string | null;
}

export interface JiraImportInput {
  jiraUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  targetProjectId: string;
}

export async function importFromJira(input: JiraImportInput) {
  const token = await getAuthToken();
  const response = await fetch(IMPORT_JIRA_FUNCTION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to import from Jira");
  }

  return response.json();
}

export async function importMappedItems(projectId: string, items: ImportItem[]) {
  if (!items.length) {
    return { inserted: 0 };
  }

  const reporter = (await supabase.auth.getUser()).data?.user?.id;
  if (!reporter) {
    throw new Error("You must be signed in to import items");
  }

  const payload = items.map(item => ({
    project_id: projectId,
    title: item.title,
    description: item.description ?? null,
    status: item.status ?? "todo",
    priority: item.priority ?? "medium",
    due_date: item.dueDate ?? null,
    story_points: item.storyPoints ?? null,
    reporter_id: reporter,
    assignee_id: item.assigneeId ?? null,
  }));

  const { error } = await supabase.from("tasks").insert(payload);
  if (error) {
    throw error;
  }

  return { inserted: payload.length };
}
