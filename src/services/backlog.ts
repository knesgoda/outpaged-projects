import { supabase } from "@/integrations/supabase/client";
import type { BacklogItem, BacklogHistoryEntry } from "@/types/backlog";
import { mapSupabaseError } from "./utils";

export interface BacklogHistoryRow {
  id: string;
  occurred_at: string | null;
  event_type: string;
  detail: string | null;
}

export interface BacklogItemTagRow {
  backlog_tags: {
    name: string | null;
  } | null;
}

export interface BacklogItemAssigneeRow {
  user_id: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface BacklogItemRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number | null;
  time_estimate_hours: number | null;
  acceptance_criteria: string[] | null;
  business_value: number;
  effort: number;
  sprint_id: string | null;
  rank: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface BacklogItemWithRelations extends BacklogItemRow {
  backlog_history?: BacklogHistoryRow[] | null;
  backlog_item_tags?: BacklogItemTagRow[] | null;
  backlog_item_assignees?: BacklogItemAssigneeRow[] | null;
}

export interface CreateBacklogItemInput {
  title: string;
  description?: string;
  status?: BacklogItem["status"];
  priority?: BacklogItem["priority"];
  storyPoints?: number | null;
  timeEstimateHours?: number | null;
  acceptanceCriteria?: string[];
  businessValue?: number;
  effort?: number;
  tags?: string[];
  assigneeId?: string | null;
  sprintId?: string | null;
  rank?: number;
}

export interface UpdateBacklogItemInput extends Partial<CreateBacklogItemInput> {}

export interface BacklogHistoryInput {
  type: BacklogHistoryEntry["type"];
  detail: string;
}

const HISTORY_TYPE_MAP: Record<string, BacklogHistoryEntry["type"]> = {
  rank_change: "rank_change",
  status_change: "status_change",
  estimate_update: "estimate_update",
  story_points_update: "story_points_update",
  moved_to_sprint: "moved_to_sprint",
};

const EMPTY_ARRAY: string[] = [];

const normalizeNumber = (value: number | null | undefined): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const normalizeRank = (value: number | string | null | undefined): number | undefined => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) {
    return "";
  }
  const parts = name.trim().split(/\s+/g);
  const initials = parts
    .map((part) => part[0]?.toUpperCase())
    .filter((char): char is string => Boolean(char))
    .slice(0, 2)
    .join("");
  return initials || name.slice(0, 2).toUpperCase();
};

export function mapBacklogRow(row: BacklogItemWithRelations): BacklogItem {
  const acceptanceCriteria = row.acceptance_criteria ?? EMPTY_ARRAY;
  const history = (row.backlog_history ?? [])
    .map((entry): BacklogHistoryEntry => ({
      id: entry.id,
      timestamp: (entry.occurred_at ?? new Date().toISOString()),
      type: HISTORY_TYPE_MAP[entry.event_type] ?? "status_change",
      detail: entry.detail ?? "",
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const tags = (row.backlog_item_tags ?? [])
    .map((entry) => entry.backlog_tags?.name?.trim())
    .filter((value): value is string => Boolean(value));

  const assigneeRow = (row.backlog_item_assignees ?? []).find(
    (candidate) => Boolean(candidate.user_id)
  );

  const assigneeProfile = assigneeRow?.profiles;

  const assignee = assigneeProfile
    ? {
        name: assigneeProfile.full_name ?? "",
        avatar: assigneeProfile.avatar_url ?? undefined,
        initials: getInitials(assigneeProfile.full_name),
      }
    : undefined;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    status: (row.status as BacklogItem["status"]) ?? "new",
    priority: (row.priority as BacklogItem["priority"]) ?? "medium",
    storyPoints: normalizeNumber(row.story_points),
    timeEstimateHours: normalizeNumber(row.time_estimate_hours),
    acceptanceCriteria,
    tags,
    businessValue: row.business_value ?? 0,
    effort: row.effort ?? 0,
    createdAt: new Date(row.created_at),
    sprintId: row.sprint_id ?? undefined,
    rank: normalizeRank(row.rank),
    history,
    assignee,
  };
}

async function fetchBacklogItemById(id: string): Promise<BacklogItem> {
  const { data, error } = await supabase
    .from("backlog_items")
    .select(
      `
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
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Failed to load backlog item");
  }
  if (!data) {
    throw new Error("Backlog item not found");
  }
  return mapBacklogRow(data as BacklogItemWithRelations);
}

function mapBacklogPayload(input: Partial<CreateBacklogItemInput>) {
  const payload: Record<string, unknown> = {};
  if (typeof input.title === "string") {
    payload.title = input.title.trim();
  }
  if (typeof input.description === "string") {
    payload.description = input.description;
  }
  if (typeof input.status === "string") {
    payload.status = input.status;
  }
  if (typeof input.priority === "string") {
    payload.priority = input.priority;
  }
  if (typeof input.storyPoints !== "undefined") {
    payload.story_points = input.storyPoints ?? null;
  }
  if (typeof input.timeEstimateHours !== "undefined") {
    payload.time_estimate_hours = input.timeEstimateHours ?? null;
  }
  if (typeof input.acceptanceCriteria !== "undefined") {
    payload.acceptance_criteria = input.acceptanceCriteria ?? EMPTY_ARRAY;
  }
  if (typeof input.businessValue !== "undefined") {
    payload.business_value = input.businessValue ?? 0;
  }
  if (typeof input.effort !== "undefined") {
    payload.effort = input.effort ?? 0;
  }
  if (typeof input.sprintId !== "undefined") {
    payload.sprint_id = input.sprintId ?? null;
  }
  if (typeof input.rank !== "undefined") {
    payload.rank = input.rank ?? 0;
  }
  return payload;
}

async function syncTags(backlogItemId: string, tags?: string[]) {
  if (!tags) {
    return;
  }

  const normalized = tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const { error: deleteError } = await supabase
    .from("backlog_item_tags")
    .delete()
    .eq("backlog_item_id", backlogItemId);

  if (deleteError) {
    throw mapSupabaseError(deleteError, "Failed to reset backlog item tags");
  }

  if (!normalized.length) {
    return;
  }

  const { data: tagRows, error: tagError } = await supabase
    .from("backlog_tags")
    .upsert(normalized.map((name) => ({ name })), { onConflict: "name" })
    .select();

  if (tagError) {
    throw mapSupabaseError(tagError, "Failed to upsert backlog tags");
  }

  const tagsByName = new Map<string, string>();
  for (const row of tagRows ?? []) {
    if (row?.name && row.id) {
      tagsByName.set(row.name.toLowerCase(), row.id);
    }
  }

  const inserts = normalized
    .map((name) => tagsByName.get(name.toLowerCase()))
    .filter((id): id is string => Boolean(id))
    .map((tagId) => ({ backlog_item_id: backlogItemId, tag_id: tagId }));

  if (!inserts.length) {
    return;
  }

  const { error: relationError } = await supabase
    .from("backlog_item_tags")
    .insert(inserts);

  if (relationError) {
    throw mapSupabaseError(relationError, "Failed to relate backlog tags");
  }
}

async function syncAssignee(backlogItemId: string, assigneeId?: string | null) {
  const { error: clearError } = await supabase
    .from("backlog_item_assignees")
    .delete()
    .eq("backlog_item_id", backlogItemId);

  if (clearError) {
    throw mapSupabaseError(clearError, "Failed to clear backlog assignee");
  }

  if (!assigneeId) {
    return;
  }

  const { error: assignError } = await supabase
    .from("backlog_item_assignees")
    .insert({ backlog_item_id: backlogItemId, user_id: assigneeId });

  if (assignError) {
    throw mapSupabaseError(assignError, "Failed to assign backlog item");
  }
}

export async function recordBacklogHistory(
  backlogItemId: string,
  entry: BacklogHistoryInput
) {
  const { error } = await supabase.from("backlog_history").insert({
    backlog_item_id: backlogItemId,
    event_type: entry.type,
    detail: entry.detail,
  });

  if (error) {
    throw mapSupabaseError(error, "Failed to record backlog history");
  }
}

async function resolveNextRank(): Promise<number> {
  const { data, error } = await supabase
    .from("backlog_items")
    .select("rank")
    .order("rank", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Failed to resolve backlog rank");
  }

  const current = data?.rank;
  if (typeof current === "number") {
    return current + 1;
  }
  if (typeof current === "string") {
    const parsed = Number.parseFloat(current);
    if (Number.isFinite(parsed)) {
      return parsed + 1;
    }
  }
  return 1;
}

export async function listBacklogItems(): Promise<BacklogItem[]> {
  const { data, error } = await supabase
    .from("backlog_items")
    .select(
      `
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
      `
    )
    .is("archived_at", null)
    .order("rank", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Failed to load backlog items");
  }

  return (data ?? []).map((row) => mapBacklogRow(row as BacklogItemWithRelations));
}

export async function createBacklogItem(
  input: CreateBacklogItemInput
): Promise<BacklogItem> {
  const payload: Record<string, unknown> = {
    status: "new",
    priority: "medium",
    business_value: 0,
    effort: 0,
    rank: input.rank,
    ...mapBacklogPayload(input),
  };

  if (typeof payload.rank === "undefined") {
    payload.rank = await resolveNextRank();
  }

  const timestamp = new Date().toISOString();
  payload.updated_at = timestamp;
  payload.created_at = timestamp;

  const { data, error } = await supabase
    .from("backlog_items")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Failed to create backlog item");
  }

  const id = data?.id;
  if (!id) {
    throw new Error("Backlog item id missing after creation");
  }

  await syncTags(id, input.tags ?? []);
  await syncAssignee(id, input.assigneeId ?? null);

  await recordBacklogHistory(id, {
    type: "status_change",
    detail: "Backlog item created",
  });

  return fetchBacklogItemById(id);
}

export async function updateBacklogItem(
  id: string,
  updates: UpdateBacklogItemInput,
  history?: BacklogHistoryInput
): Promise<BacklogItem> {
  const payload = mapBacklogPayload(updates);
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("backlog_items")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Failed to update backlog item");
  }

  if (typeof updates.tags !== "undefined") {
    await syncTags(id, updates.tags ?? []);
  }

  if (typeof updates.assigneeId !== "undefined") {
    await syncAssignee(id, updates.assigneeId ?? null);
  }

  if (history) {
    await recordBacklogHistory(id, history);
  }

  return fetchBacklogItemById(id);
}

export async function reorderBacklogItems(
  order: Array<{ id: string; rank: number }>
) {
  if (!order.length) {
    return;
  }

  const timestamp = new Date().toISOString();
  const updates = order.map(({ id, rank }) => ({
    id,
    rank,
    updated_at: timestamp,
  }));

  const { error } = await supabase.from("backlog_items").upsert(updates);
  if (error) {
    throw mapSupabaseError(error, "Failed to reorder backlog items");
  }

  const historyEntries = order.map(({ id, rank }) => ({
    backlog_item_id: id,
    event_type: "rank_change",
    detail: `Rank adjusted to ${rank}`,
  }));

  const { error: historyError } = await supabase
    .from("backlog_history")
    .insert(historyEntries);

  if (historyError) {
    throw mapSupabaseError(historyError, "Failed to record backlog rank history");
  }
}

export async function archiveBacklogItem(id: string, detail = "Backlog item archived") {
  const timestamp = new Date().toISOString();
  const { error } = await supabase
    .from("backlog_items")
    .update({ archived_at: timestamp, updated_at: timestamp })
    .eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Failed to archive backlog item");
  }

  await recordBacklogHistory(id, { type: "status_change", detail });
}
