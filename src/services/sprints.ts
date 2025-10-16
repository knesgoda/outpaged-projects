import { supabase } from "@/integrations/supabase/client";
import type { BacklogItem } from "@/types/backlog";
import { mapSupabaseError } from "./utils";
import {
  mapBacklogRow,
  recordBacklogHistory,
  type BacklogItemWithRelations,
} from "./backlog";

interface SprintItemRow {
  id: string;
  position: number | null;
  committed_points: number | null;
  backlog_items: BacklogItemWithRelations | null;
}

interface SprintRow {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  velocity_history: unknown;
  member_capacity: unknown;
  created_at: string;
  updated_at: string;
  sprint_items?: SprintItemRow[] | null;
}

export interface SprintWithItems {
  id: string;
  name: string;
  goal: string | null;
  status: "planning" | "active" | "completed";
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  velocityHistory: number[];
  memberCapacity: Record<string, number>;
  items: BacklogItem[];
}

export interface CreateSprintInput {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  status?: "planning" | "active" | "completed";
  memberCapacity?: Record<string, number>;
  velocityHistory?: number[];
}

export interface UpdateSprintInput extends Partial<CreateSprintInput> {}

const parseVelocityHistory = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "number" ? entry : Number.parseFloat(String(entry))))
    .filter((entry) => Number.isFinite(entry));
};

const parseMemberCapacity = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const entries: Array<[string, number]> = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const numeric = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
    if (Number.isFinite(numeric)) {
      entries.push([key, numeric]);
    }
  }
  return Object.fromEntries(entries);
};

export function mapSprintRow(row: SprintRow): SprintWithItems {
  const items = (row.sprint_items ?? [])
    .filter((entry): entry is SprintItemRow & { backlog_items: BacklogItemWithRelations } =>
      Boolean(entry.backlog_items)
    )
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((entry) => mapBacklogRow(entry.backlog_items as BacklogItemWithRelations));

  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    status: (row.status as SprintWithItems["status"]) ?? "planning",
    startDate: row.start_date,
    endDate: row.end_date,
    capacity: row.capacity,
    velocityHistory: parseVelocityHistory(row.velocity_history),
    memberCapacity: parseMemberCapacity(row.member_capacity),
    items,
  };
}

export async function listSprints(): Promise<SprintWithItems[]> {
  const { data, error } = await supabase
    .from("sprints")
    .select(
      `
        id,
        name,
        goal,
        status,
        start_date,
        end_date,
        capacity,
        velocity_history,
        member_capacity,
        created_at,
        updated_at,
        sprint_items ( id, position, committed_points, backlog_items (
          id,
          title,
          description,
          status,
          priority,
          story_points,
          time_estimate_hours,
          acceptance_criteria,
          business_value,
          effort,
          sprint_id,
          rank,
          created_at,
          updated_at,
          archived_at,
          backlog_history ( id, occurred_at, event_type, detail ),
          backlog_item_tags ( backlog_tags ( name ) ),
          backlog_item_assignees ( user_id, profiles ( full_name, avatar_url ) )
        ) )
      `
    )
    .order("start_date", { ascending: false });

  if (error) {
    throw mapSupabaseError(error, "Failed to load sprints");
  }

  return (data ?? []).map((row) => mapSprintRow(row as SprintRow));
}

export async function createSprint(input: CreateSprintInput): Promise<SprintWithItems> {
  const now = new Date().toISOString();
  const payload = {
    name: input.name.trim(),
    goal: input.goal ?? null,
    status: input.status ?? "planning",
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    capacity: input.capacity ?? null,
    velocity_history: input.velocityHistory ?? [],
    member_capacity: input.memberCapacity ?? {},
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("sprints")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Failed to create sprint");
  }
  if (!data?.id) {
    throw new Error("Sprint not created");
  }

  return fetchSprintById(data.id);
}

export async function updateSprint(id: string, updates: UpdateSprintInput): Promise<SprintWithItems> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.name === "string") {
    payload.name = updates.name.trim();
  }
  if (typeof updates.goal === "string") {
    payload.goal = updates.goal;
  }
  if (typeof updates.status === "string") {
    payload.status = updates.status;
  }
  if (typeof updates.startDate !== "undefined") {
    payload.start_date = updates.startDate ?? null;
  }
  if (typeof updates.endDate !== "undefined") {
    payload.end_date = updates.endDate ?? null;
  }
  if (typeof updates.capacity !== "undefined") {
    payload.capacity = updates.capacity ?? null;
  }
  if (typeof updates.velocityHistory !== "undefined") {
    payload.velocity_history = updates.velocityHistory ?? [];
  }
  if (typeof updates.memberCapacity !== "undefined") {
    payload.member_capacity = updates.memberCapacity ?? {};
  }

  if (Object.keys(payload).length <= 1) {
    return fetchSprintById(id);
  }

  const { error } = await supabase.from("sprints").update(payload).eq("id", id);
  if (error) {
    throw mapSupabaseError(error, "Failed to update sprint");
  }

  return fetchSprintById(id);
}

async function fetchSprintById(id: string): Promise<SprintWithItems> {
  const { data, error } = await supabase
    .from("sprints")
    .select(
      `
        id,
        name,
        goal,
        status,
        start_date,
        end_date,
        capacity,
        velocity_history,
        member_capacity,
        created_at,
        updated_at,
        sprint_items ( id, position, committed_points, backlog_items (
          id,
          title,
          description,
          status,
          priority,
          story_points,
          time_estimate_hours,
          acceptance_criteria,
          business_value,
          effort,
          sprint_id,
          rank,
          created_at,
          updated_at,
          archived_at,
          backlog_history ( id, occurred_at, event_type, detail ),
          backlog_item_tags ( backlog_tags ( name ) ),
          backlog_item_assignees ( user_id, profiles ( full_name, avatar_url ) )
        ) )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Failed to load sprint");
  }
  if (!data) {
    throw new Error("Sprint not found");
  }

  return mapSprintRow(data as SprintRow);
}

export async function assignBacklogItemToSprint(
  backlogItemId: string,
  sprintId: string
) {
  const { data, error } = await supabase
    .from("sprint_items")
    .select("position")
    .eq("sprint_id", sprintId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Failed to resolve sprint position");
  }

  const nextPosition = (data?.position ?? 0) + 1;

  const timestamp = new Date().toISOString();

  const { error: linkError } = await supabase
    .from("sprint_items")
    .upsert({
      sprint_id: sprintId,
      backlog_item_id: backlogItemId,
      position: nextPosition,
      committed_points: null,
      added_at: timestamp,
    });

  if (linkError) {
    throw mapSupabaseError(linkError, "Failed to assign backlog item to sprint");
  }

  const { error: updateError } = await supabase
    .from("backlog_items")
    .update({ sprint_id: sprintId, status: "in_sprint", updated_at: timestamp })
    .eq("id", backlogItemId);

  if (updateError) {
    throw mapSupabaseError(updateError, "Failed to update backlog sprint assignment");
  }

  await recordBacklogHistory(backlogItemId, {
    type: "moved_to_sprint",
    detail: "Assigned to sprint",
  });
}

export async function removeBacklogItemFromSprint(
  backlogItemId: string,
  sprintId: string
) {
  const { error } = await supabase
    .from("sprint_items")
    .delete()
    .eq("sprint_id", sprintId)
    .eq("backlog_item_id", backlogItemId);

  if (error) {
    throw mapSupabaseError(error, "Failed to remove sprint assignment");
  }

  const timestamp = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("backlog_items")
    .update({ sprint_id: null, status: "ready", updated_at: timestamp })
    .eq("id", backlogItemId);

  if (updateError) {
    throw mapSupabaseError(updateError, "Failed to release backlog item");
  }

  await recordBacklogHistory(backlogItemId, {
    type: "status_change",
    detail: "Removed from sprint",
  });
}

export async function startSprint(id: string) {
  await updateSprint(id, {
    status: "active",
    startDate: new Date().toISOString().slice(0, 10),
  });
}

export async function completeSprint(id: string) {
  await updateSprint(id, {
    status: "completed",
    endDate: new Date().toISOString().slice(0, 10),
  });
}
