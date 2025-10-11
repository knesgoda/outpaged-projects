import { supabase } from "@/integrations/supabase/client";
import { listGitHubRepos } from "@/services/github";
import { listDocs } from "@/services/docs";
import { listMyTickets } from "@/services/support";
import { triggerIntegrationSync } from "@/services/calendarIntegrations";
import type { TaskIntegrationBadge } from "@/types/tasks";

export interface LoadTaskIntegrationOptions {
  taskId: string;
  projectCode?: string | null;
  includeCalendarIntegrationId?: string;
}

type SettledBadge = PromiseSettledResult<TaskIntegrationBadge>;

const normalizeBadge = (result: SettledBadge | undefined): TaskIntegrationBadge | null => {
  if (!result) return null;
  if (result.status === "fulfilled" && result.value) {
    return result.value;
  }
  return null;
};

const toBadge = (input: Partial<TaskIntegrationBadge> & { type: TaskIntegrationBadge["type"] }): TaskIntegrationBadge => ({
  id: `${input.type}-${input.id ?? "status"}`,
  status: "pending",
  label: `${input.type} pending`,
  tooltip: `No ${input.type} integration connected.`,
  ...input,
});

const resolveGitStatus = async ({ taskId, projectCode }: LoadTaskIntegrationOptions): Promise<TaskIntegrationBadge> => {
  try {
    const repos = await listGitHubRepos();
    const matchingRepo = repos.find((repo) => {
      if (!projectCode) return false;
      return repo.full_name?.toLowerCase().includes(projectCode.toLowerCase());
    });

    if (matchingRepo) {
      return toBadge({
        type: "git",
        status: "connected",
        label: "Git linked",
        tooltip: `Synced with ${matchingRepo.full_name}.`,
        lastSyncedAt: matchingRepo.updated_at ?? undefined,
      });
    }

    if (repos.length > 0) {
      return toBadge({
        type: "git",
        status: "warning",
        label: "Git available",
        tooltip: "Repositories detected but none linked to this work item.",
      });
    }
  } catch (error) {
    return toBadge({
      type: "git",
      status: "error",
      label: "Git error",
      tooltip: error instanceof Error ? error.message : "Unable to load Git integrations.",
    });
  }

  return toBadge({
    type: "git",
    status: "pending",
    label: "Git not linked",
    tooltip: "Connect a repository to sync branches and pull requests.",
  });
};

const resolveCiStatus = async ({ taskId }: LoadTaskIntegrationOptions): Promise<TaskIntegrationBadge> => {
  try {
    const { data, error } = await (supabase as any).rpc("ci_latest_for_task", { task_id: taskId });
    if (error) {
      throw new Error(error.message ?? "Failed to load CI status");
    }

    if (data?.status === "passed") {
      return toBadge({
        type: "ci",
        status: "connected",
        label: "CI green",
        tooltip: "Latest pipeline succeeded.",
        lastSyncedAt: data.completed_at ?? undefined,
      });
    }

    if (data?.status === "failed" || data?.status === "failing") {
      return toBadge({
        type: "ci",
        status: "warning",
        label: "CI failing",
        tooltip: "Recent pipeline run failed.",
        lastSyncedAt: data.completed_at ?? undefined,
      });
    }
  } catch (error) {
    return toBadge({
      type: "ci",
      status: "error",
      label: "CI unavailable",
      tooltip: error instanceof Error ? error.message : "Unable to contact CI integration.",
    });
  }

  return toBadge({
    type: "ci",
    status: "pending",
    label: "CI pending",
    tooltip: "No recent pipeline runs for this task.",
  });
};

const resolveDesignStatus = async ({ taskId, projectCode }: LoadTaskIntegrationOptions): Promise<TaskIntegrationBadge> => {
  try {
    const docs = await listDocs({ q: projectCode ?? taskId });
    if (docs.length > 0) {
      return toBadge({
        type: "design",
        status: "connected",
        label: "Design linked",
        tooltip: `Connected to ${docs.length} design document${docs.length === 1 ? "" : "s"}.`,
        lastSyncedAt: docs[0]?.updated_at ?? undefined,
      });
    }
  } catch (error) {
    return toBadge({
      type: "design",
      status: "error",
      label: "Design error",
      tooltip: error instanceof Error ? error.message : "Unable to load design integrations.",
    });
  }

  return toBadge({
    type: "design",
    status: "pending",
    label: "Design pending",
    tooltip: "Link a design spec or review to surface here.",
  });
};

const resolveSupportStatus = async ({ taskId }: LoadTaskIntegrationOptions): Promise<TaskIntegrationBadge> => {
  try {
    const tickets = await listMyTickets();
    const related = tickets.find((ticket) => ticket.subject?.includes(taskId));
    if (related) {
      const resolved = related.status === "resolved" || related.status === "closed";
      return toBadge({
        type: "support",
        status: resolved ? "connected" : "warning",
        label: resolved ? "Support resolved" : "Support active",
        tooltip: resolved
          ? "Linked support ticket resolved."
          : "Open support conversation linked to this work.",
        lastSyncedAt: related.updated_at ?? undefined,
      });
    }
  } catch (error) {
    return toBadge({
      type: "support",
      status: "error",
      label: "Support error",
      tooltip: error instanceof Error ? error.message : "Unable to load support tickets.",
    });
  }

  return toBadge({
    type: "support",
    status: "pending",
    label: "Support pending",
    tooltip: "No support tickets linked to this task.",
  });
};

const resolveCalendarStatus = async ({ includeCalendarIntegrationId }: LoadTaskIntegrationOptions): Promise<TaskIntegrationBadge> => {
  if (!includeCalendarIntegrationId) {
    return toBadge({
      type: "calendar",
      status: "pending",
      label: "Calendar pending",
      tooltip: "Sync a calendar event to surface availability and meetings.",
    });
  }

  try {
    const result = await triggerIntegrationSync(includeCalendarIntegrationId);
    return toBadge({
      type: "calendar",
      status: "connected",
      label: "Calendar synced",
      tooltip: "Calendar integration recently synced.",
      lastSyncedAt: result.syncedAt,
    });
  } catch (error) {
    return toBadge({
      type: "calendar",
      status: "error",
      label: "Calendar error",
      tooltip: error instanceof Error ? error.message : "Unable to refresh calendar integration.",
    });
  }
};

export async function loadTaskIntegrationStatus(
  options: LoadTaskIntegrationOptions
): Promise<TaskIntegrationBadge[]> {
  const results = await Promise.allSettled([
    resolveGitStatus(options),
    resolveCiStatus(options),
    resolveDesignStatus(options),
    resolveSupportStatus(options),
    resolveCalendarStatus(options),
  ]);

  return results
    .map((result) => normalizeBadge(result))
    .filter((badge): badge is TaskIntegrationBadge => Boolean(badge));
}

