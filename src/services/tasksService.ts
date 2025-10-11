import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  TaskAssignee,
  TaskDependencyType,
  TaskFileReference,
  TaskLinkReference,
  TaskRelationSummary,
  TaskRollup,
  TaskSubitemSummary,
  TaskTag,
  TaskWithDetails,
  TaskPriority,
  TaskHierarchyLevel,
  TaskStatus,
  TaskType,
} from "@/types/tasks";
import { mapSupabaseError } from "./utils";

interface TaskRowWithProject
  extends Database["public"]["Tables"]["tasks"]["Row"] {
  projects?: {
    id: string;
    name: string | null;
    code: string | null;
  } | null;
}

export type TaskRow = TaskRowWithProject;

type TaskTagRow = Database["public"]["Tables"]["task_tags"]["Row"];
type TaskFileRow = Database["public"]["Tables"]["task_files"]["Row"];
type TaskLinkRow = Database["public"]["Tables"]["task_links"]["Row"];
type TaskSubitemRow = Database["public"]["Tables"]["task_subitems"]["Row"];
type TaskDependencyRow = Database["public"]["Tables"]["task_dependencies"]["Row"];
type TaskRelationshipRow = Database["public"]["Tables"]["task_relationships"]["Row"];

type TaskAssigneeRow = Database["public"]["Views"]["task_assignees_with_profiles"]["Row"];

type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

const DEFAULT_STATUS: TaskStatus = "todo";
const DEFAULT_PRIORITY: TaskPriority = "medium";
const DEFAULT_HIERARCHY: TaskHierarchyLevel = "task";
const DEFAULT_TYPE: TaskType = "task";

const isJsonArray = (value: unknown): value is unknown[] => Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function serializeTaskRow(row: TaskRowWithProject): TaskWithDetails {
  const externalLinks = isJsonArray(row.external_links)
    ? row.external_links.filter(isNonEmptyString)
    : [];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: (row.status ?? DEFAULT_STATUS) as TaskStatus,
    priority: (row.priority ?? DEFAULT_PRIORITY) as TaskPriority,
    hierarchy_level: (row.hierarchy_level ?? DEFAULT_HIERARCHY) as TaskHierarchyLevel,
    task_type: (row.task_type ?? DEFAULT_TYPE) as TaskType,
    project_id: row.project_id,
    parent_id: row.parent_id,
    swimlane_id: row.swimlane_id,
    start_date: row.start_date,
    end_date: row.end_date,
    due_date: row.due_date,
    completed_at: row.completed_at ?? undefined,
    estimated_hours: row.estimated_hours ?? undefined,
    actual_hours: row.actual_hours ?? undefined,
    story_points: row.story_points ?? undefined,
    blocked: row.blocked ?? undefined,
    blocking_reason: row.blocking_reason ?? undefined,
    ticket_number: row.ticket_number ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    project: row.projects
      ? {
          id: row.projects.id,
          name: row.projects.name,
          code: row.projects.code,
        }
      : null,
    assignees: [],
    tags: [],
    tagNames: [],
    files: [],
    links: [],
    relations: [],
    subitems: [],
    rollup: undefined,
    commentCount: 0,
    attachmentCount: 0,
    externalLinks,
  };
}

export function calculateRollup(subitems: TaskSubitemSummary[]): TaskRollup | undefined {
  if (subitems.length === 0) {
    return undefined;
  }

  let total = 0;
  let completed = 0;
  let weightedTotal = 0;
  let weightedCompleted = 0;

  for (const subitem of subitems) {
    const weight = subitem.rollupWeight ?? 1;
    total += 1;
    weightedTotal += weight;
    if (subitem.completed || subitem.status === "done") {
      completed += 1;
      weightedCompleted += weight;
    }
  }

  const progress = weightedTotal > 0
    ? Math.min(1, Math.max(0, weightedCompleted / weightedTotal))
    : Math.min(1, Math.max(0, completed / total));

  return {
    total,
    completed,
    progress,
    weightedTotal,
    weightedCompleted,
  };
}

function mapAssignees(rows: TaskAssigneeRow[]): Map<string, TaskAssignee[]> {
  const map = new Map<string, TaskAssignee[]>();
  for (const row of rows) {
    if (!row.task_id || !row.user_id) continue;
    const name = row.full_name ?? "Unknown";
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "U";

    const entry: TaskAssignee = {
      id: row.user_id,
      name,
      avatar: row.avatar_url,
      initials,
    };

    if (!map.has(row.task_id)) {
      map.set(row.task_id, [entry]);
    } else {
      map.get(row.task_id)!.push(entry);
    }
  }
  return map;
}

function mapTags(rows: TaskTagRow[]): Map<string, TaskTag[]> {
  const map = new Map<string, TaskTag[]>();
  for (const row of rows) {
    const tag: TaskTag = {
      id: row.id,
      label: row.label,
      color: row.color,
      createdAt: row.created_at,
    };
    if (!map.has(row.task_id)) {
      map.set(row.task_id, [tag]);
    } else {
      map.get(row.task_id)!.push(tag);
    }
  }
  return map;
}

function mapFiles(rows: TaskFileRow[]): Map<string, TaskFileReference[]> {
  const map = new Map<string, TaskFileReference[]>();
  for (const row of rows) {
    const file: TaskFileReference = {
      id: row.id,
      url: row.file_url,
      name: row.file_name,
      size: row.file_size ?? undefined,
      mimeType: row.mime_type ?? undefined,
      uploadedAt: row.created_at,
      uploadedBy: row.uploaded_by ?? undefined,
    };
    if (!map.has(row.task_id)) {
      map.set(row.task_id, [file]);
    } else {
      map.get(row.task_id)!.push(file);
    }
  }
  return map;
}

function mapLinks(rows: TaskLinkRow[]): Map<string, TaskLinkReference[]> {
  const map = new Map<string, TaskLinkReference[]>();
  for (const row of rows) {
    const link: TaskLinkReference = {
      id: row.id,
      title: row.title ?? undefined,
      url: row.url,
      linkType: row.link_type ?? undefined,
      createdAt: row.created_at,
      createdBy: row.created_by ?? undefined,
    };
    if (!map.has(row.task_id)) {
      map.set(row.task_id, [link]);
    } else {
      map.get(row.task_id)!.push(link);
    }
  }
  return map;
}

function mapCommentCounts(rows: CommentRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const current = counts.get(row.task_id) ?? 0;
    counts.set(row.task_id, current + 1);
  }
  return counts;
}

function mapRelations(
  dependencies: TaskDependencyRow[],
  relationships: TaskRelationshipRow[],
  taskLookup: Map<string, TaskWithDetails>,
): Map<string, TaskRelationSummary[]> {
  const map = new Map<string, TaskRelationSummary[]>();

  const push = (taskId: string, relation: TaskRelationSummary) => {
    if (!map.has(taskId)) {
      map.set(taskId, [relation]);
    } else {
      map.get(taskId)!.push(relation);
    }
  };

  for (const dependency of dependencies) {
    const targetTask = taskLookup.get(dependency.target_task_id);
    const sourceTask = taskLookup.get(dependency.source_task_id);
    const base: TaskDependencyType = dependency.dependency_type;

    if (sourceTask) {
      push(dependency.source_task_id, {
        id: dependency.id,
        type: base,
        direction: "outgoing",
        relatedTaskId: dependency.target_task_id,
        relatedTaskTitle: targetTask?.title,
        relatedTaskStatus: targetTask?.status,
      });
    }
    if (targetTask) {
      push(dependency.target_task_id, {
        id: dependency.id,
        type: base,
        direction: "incoming",
        relatedTaskId: dependency.source_task_id,
        relatedTaskTitle: sourceTask?.title,
        relatedTaskStatus: sourceTask?.status,
      });
    }
  }

  for (const relationship of relationships) {
    const sourceTask = taskLookup.get(relationship.source_task_id);
    const targetTask = taskLookup.get(relationship.target_task_id);

    if (sourceTask) {
      push(relationship.source_task_id, {
        id: relationship.id,
        type: relationship.relationship_type,
        direction: "outgoing",
        relatedTaskId: relationship.target_task_id,
        relatedTaskTitle: targetTask?.title,
        relatedTaskStatus: targetTask?.status,
      });
    }

    if (targetTask) {
      push(relationship.target_task_id, {
        id: relationship.id,
        type: relationship.relationship_type,
        direction: "incoming",
        relatedTaskId: relationship.source_task_id,
        relatedTaskTitle: sourceTask?.title,
        relatedTaskStatus: sourceTask?.status,
      });
    }
  }

  return map;
}

function mapSubitems(
  rows: TaskSubitemRow[],
  taskLookup: Map<string, TaskWithDetails>,
): Map<string, TaskSubitemSummary[]> {
  const map = new Map<string, TaskSubitemSummary[]>();
  for (const row of rows) {
    const childTask = taskLookup.get(row.child_task_id);
    const summary: TaskSubitemSummary = {
      id: row.child_task_id,
      title: childTask?.title ?? "Untitled",
      status: childTask?.status ?? DEFAULT_STATUS,
      completed: childTask?.status === "done",
      rollupWeight: row.rollup_weight ?? undefined,
      estimatedHours: childTask?.estimated_hours ?? undefined,
      actualHours: childTask?.actual_hours ?? undefined,
      storyPoints: childTask?.story_points ?? undefined,
    };
    if (!map.has(row.parent_task_id)) {
      map.set(row.parent_task_id, [summary]);
    } else {
      map.get(row.parent_task_id)!.push(summary);
    }
  }
  return map;
}

export async function tasksWithDetails(projectId: string): Promise<TaskWithDetails[]> {
  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select(`*, projects:projects(id, name, code)`)
    .eq("project_id", projectId);

  if (taskError) {
    throw mapSupabaseError(taskError, "Unable to load tasks");
  }

  const rows = (taskRows ?? []) as TaskRowWithProject[];
  const taskMap = new Map<string, TaskWithDetails>();

  for (const row of rows) {
    const task = serializeTaskRow(row);
    taskMap.set(task.id, task);
  }

  const taskIds = rows.map((row) => row.id);

  if (taskIds.length === 0) {
    return [];
  }

  const [
    assigneesRes,
    tagsRes,
    filesRes,
    linksRes,
    subitemsRes,
    dependencySourceRes,
    dependencyTargetRes,
    relationshipSourceRes,
    relationshipTargetRes,
    commentsRes,
  ] = await Promise.all([
    supabase.from("task_assignees_with_profiles").select("task_id, user_id, full_name, avatar_url").in("task_id", taskIds),
    supabase.from("task_tags").select("*").in("task_id", taskIds),
    supabase.from("task_files").select("*").in("task_id", taskIds),
    supabase.from("task_links").select("*").in("task_id", taskIds),
    supabase.from("task_subitems").select("*").in("parent_task_id", taskIds),
    supabase.from("task_dependencies").select("*").in("source_task_id", taskIds),
    supabase.from("task_dependencies").select("*").in("target_task_id", taskIds),
    supabase.from("task_relationships").select("*").in("source_task_id", taskIds),
    supabase.from("task_relationships").select("*").in("target_task_id", taskIds),
    supabase.from("comments").select("id, task_id").in("task_id", taskIds),
  ]);

  if (assigneesRes.error) throw mapSupabaseError(assigneesRes.error, "Unable to load task assignees");
  if (tagsRes.error) throw mapSupabaseError(tagsRes.error, "Unable to load task tags");
  if (filesRes.error) throw mapSupabaseError(filesRes.error, "Unable to load task files");
  if (linksRes.error) throw mapSupabaseError(linksRes.error, "Unable to load task links");
  if (subitemsRes.error) throw mapSupabaseError(subitemsRes.error, "Unable to load task subitems");
  if (dependencySourceRes.error) throw mapSupabaseError(dependencySourceRes.error, "Unable to load task dependencies");
  if (dependencyTargetRes.error) throw mapSupabaseError(dependencyTargetRes.error, "Unable to load task dependencies");
  if (relationshipSourceRes.error) throw mapSupabaseError(relationshipSourceRes.error, "Unable to load task relationships");
  if (relationshipTargetRes.error) throw mapSupabaseError(relationshipTargetRes.error, "Unable to load task relationships");
  if (commentsRes.error) throw mapSupabaseError(commentsRes.error, "Unable to load task comments");

  const assigneeMap = mapAssignees((assigneesRes.data ?? []) as TaskAssigneeRow[]);
  const tagMap = mapTags((tagsRes.data ?? []) as TaskTagRow[]);
  const fileMap = mapFiles((filesRes.data ?? []) as TaskFileRow[]);
  const linkMap = mapLinks((linksRes.data ?? []) as TaskLinkRow[]);
  const subitemMap = mapSubitems((subitemsRes.data ?? []) as TaskSubitemRow[], taskMap);
  const dependencyRowsMap = new Map<string, TaskDependencyRow>();
  for (const row of (dependencySourceRes.data ?? []) as TaskDependencyRow[]) {
    dependencyRowsMap.set(row.id, row);
  }
  for (const row of (dependencyTargetRes.data ?? []) as TaskDependencyRow[]) {
    dependencyRowsMap.set(row.id, row);
  }
  const relationshipRowsMap = new Map<string, TaskRelationshipRow>();
  for (const row of (relationshipSourceRes.data ?? []) as TaskRelationshipRow[]) {
    relationshipRowsMap.set(row.id, row);
  }
  for (const row of (relationshipTargetRes.data ?? []) as TaskRelationshipRow[]) {
    relationshipRowsMap.set(row.id, row);
  }

  const relationMap = mapRelations(
    Array.from(dependencyRowsMap.values()),
    Array.from(relationshipRowsMap.values()),
    taskMap,
  );
  const commentCounts = mapCommentCounts((commentsRes.data ?? []) as CommentRow[]);

  for (const task of taskMap.values()) {
    const assignees = assigneeMap.get(task.id) ?? [];
    task.assignees = assignees;

    const tags = tagMap.get(task.id) ?? [];
    task.tags = tags;
    task.tagNames = Array.from(new Set(tags.map((tag) => tag.label)));

    const files = fileMap.get(task.id) ?? [];
    task.files = files;
    task.attachmentCount = files.length;

    const links = linkMap.get(task.id) ?? [];
    task.links = links;

    const subitems = subitemMap.get(task.id) ?? [];
    task.subitems = subitems;
    task.rollup = calculateRollup(subitems);

    const relations = relationMap.get(task.id) ?? [];
    task.relations = relations;

    task.commentCount = commentCounts.get(task.id) ?? 0;
  }

  return Array.from(taskMap.values());
}

export type { TaskWithDetails } from "@/types/tasks";
