import { supabase } from "@/integrations/supabase/client";
import type { Goal, GoalUpdate, KeyResult } from "@/types";

const GOAL_SELECT = "*";

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to modify goals.");
  }
  return userId;
}

const clampProgress = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Number(value)));
};

export async function listGoals(params?: {
  projectId?: string;
  cycleId?: string;
  q?: string;
  status?: string;
  includeArchived?: boolean;
}): Promise<Goal[]> {
  let query = supabase.from("goals").select(GOAL_SELECT).order("created_at", { ascending: false });

  if (params?.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params?.cycleId) {
    query = query.eq("cycle_id", params.cycleId);
  }

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  } else if (!params?.includeArchived) {
    query = query.neq("status", "archived");
  }

  if (params?.q) {
    query = query.ilike("title", `%${params.q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Goal[]) ?? [];
}

export async function getGoal(id: string): Promise<Goal | null> {
  const { data, error } = await supabase.from("goals").select(GOAL_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Goal | null) ?? null;
}

export async function createGoal(input: Partial<Goal> & { title: string }): Promise<Goal> {
  const owner = await requireUserId();
  const payload = {
    owner,
    title: input.title,
    description: input.description ?? null,
    project_id: input.project_id ?? null,
    parent_goal_id: input.parent_goal_id ?? null,
    cycle_id: input.cycle_id ?? null,
    status: input.status ?? "on_track",
    weight: input.weight ?? 1,
    progress: clampProgress(input.progress ?? 0),
    is_private: input.is_private ?? false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("goals").insert(payload).select(GOAL_SELECT).single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(
  id: string,
  patch: Partial<
    Pick<
      Goal,
      "title" | "description" | "status" | "weight" | "cycle_id" | "parent_goal_id" | "is_private" | "project_id"
    >
  >
): Promise<Goal> {
  const owner = await requireUserId();
  const payload: Record<string, unknown> = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  if (payload.weight !== undefined) {
    payload.weight = Number(payload.weight) || 1;
  }

  const { data, error } = await supabase
    .from("goals")
    .update(payload)
    .eq("id", id)
    .eq("owner", owner)
    .select(GOAL_SELECT)
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(id: string): Promise<void> {
  const owner = await requireUserId();
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("owner", owner);
  if (error) throw error;
}

export async function listKeyResults(goalId: string): Promise<KeyResult[]> {
  const { data, error } = await supabase
    .from("key_results")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as KeyResult[]) ?? [];
}

export async function createKeyResult(
  goalId: string,
  input: Omit<KeyResult, "id" | "goal_id" | "created_at" | "updated_at">
): Promise<KeyResult> {
  await requireUserId();
  const payload = {
    goal_id: goalId,
    title: input.title,
    metric_start: input.metric_start ?? null,
    metric_target: input.metric_target ?? null,
    metric_current: input.metric_current ?? null,
    unit: input.unit ?? null,
    weight: input.weight ?? 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("key_results").insert(payload).select("*").single();
  if (error) throw error;
  return data as KeyResult;
}

export async function updateKeyResult(id: string, patch: Partial<KeyResult>): Promise<KeyResult> {
  await requireUserId();
  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  } as Partial<KeyResult> & { updated_at: string };

  const { data, error } = await supabase.from("key_results").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as KeyResult;
}

export async function deleteKeyResult(id: string): Promise<void> {
  await requireUserId();
  const { error } = await supabase.from("key_results").delete().eq("id", id);
  if (error) throw error;
}

export async function listGoalUpdates(goalId: string): Promise<GoalUpdate[]> {
  const { data, error } = await supabase
    .from("goal_updates")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as GoalUpdate[]) ?? [];
}

export async function createGoalUpdate(
  goalId: string,
  input: Omit<GoalUpdate, "id" | "goal_id" | "created_at">
): Promise<GoalUpdate> {
  const userId = await requireUserId();
  const payload = {
    goal_id: goalId,
    status: input.status,
    note: input.note ?? null,
    progress: input.progress ?? null,
    created_by: input.created_by ?? userId,
  };

  if (payload.progress != null) {
    payload.progress = clampProgress(Number(payload.progress));
  }

  const { data, error } = await supabase.from("goal_updates").insert(payload).select("*").single();
  if (error) throw error;
  return data as GoalUpdate;
}

function calculateKeyResultProgress(result: KeyResult): number {
  const start = result.metric_start ?? 0;
  const target = result.metric_target ?? 100;
  const current = result.metric_current ?? start;
  if (target === start) {
    return current >= target ? 100 : 0;
  }
  const progress = ((current - start) / (target - start)) * 100;
  return clampProgress(progress);
}

export async function recalculateGoalProgress(goalId: string): Promise<number> {
  const { data: keyResults, error: keyResultError } = await supabase
    .from("key_results")
    .select("id, weight, metric_start, metric_target, metric_current")
    .eq("goal_id", goalId);

  if (keyResultError) throw keyResultError;

  let progress = 0;

  if (keyResults && keyResults.length > 0) {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const result of keyResults as KeyResult[]) {
      const weight = result.weight && result.weight > 0 ? result.weight : 1;
      totalWeight += weight;
      weightedSum += weight * calculateKeyResultProgress(result);
    }
    progress = totalWeight > 0 ? weightedSum / totalWeight : 0;
  } else {
    const { data: childGoals, error: childError } = await supabase
      .from("goals")
      .select("id, progress, weight")
      .eq("parent_goal_id", goalId);
    if (childError) throw childError;

    if (childGoals && childGoals.length > 0) {
      let totalWeight = 0;
      let weightedSum = 0;
      for (const child of childGoals as Goal[]) {
        const weight = child.weight && child.weight > 0 ? child.weight : 1;
        totalWeight += weight;
        weightedSum += weight * clampProgress(child.progress);
      }
      progress = totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
  }

  const clamped = clampProgress(progress);
  const { error } = await supabase
    .from("goals")
    .update({ progress: clamped, updated_at: new Date().toISOString() })
    .eq("id", goalId);
  if (error) throw error;
  return clamped;
}
