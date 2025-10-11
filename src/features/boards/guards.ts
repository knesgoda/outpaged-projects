import type { ColumnBaseMetadata, ColumnChecklistItem } from "@/types/boardColumns";
import type { Task } from "@/components/kanban/TaskCard";

export interface WipEvaluationContext {
  metadata?: ColumnBaseMetadata;
  totalInColumn: number;
  totalInLane: number;
  laneId?: string | null;
}

export type WipEvaluationStatus = "ok" | "override" | "blocked";

export interface WipEvaluationResult {
  status: WipEvaluationStatus;
  limit: number | null;
  policy: ColumnBaseMetadata["wip"]["policy"];
  reason: "column" | "lane" | null;
}

export function evaluateWipGuard({
  metadata,
  totalInColumn,
  totalInLane,
  laneId,
}: WipEvaluationContext): WipEvaluationResult {
  const policy = metadata?.wip.policy ?? "allow_override";
  const columnLimit = metadata?.wip.columnLimit ?? null;
  const laneKey = laneId ?? "__unassigned__";
  const laneLimit = metadata?.wip.laneLimits?.[laneKey];

  const appliedLimit = typeof laneLimit === "number" ? laneLimit : columnLimit;
  if (typeof appliedLimit !== "number" || appliedLimit <= 0) {
    return { status: "ok", limit: null, policy, reason: null };
  }

  const count = typeof laneLimit === "number" ? totalInLane : totalInColumn;
  if (count < appliedLimit) {
    return { status: "ok", limit: appliedLimit, policy, reason: null };
  }

  if (policy === "strict") {
    return { status: "blocked", limit: appliedLimit, policy, reason: laneLimit ? "lane" : "column" };
  }

  return { status: "override", limit: appliedLimit, policy, reason: laneLimit ? "lane" : "column" };
}

export interface ChecklistItemEvaluation extends ColumnChecklistItem {
  satisfied: boolean;
}

export interface ChecklistEvaluationResult {
  ready: ChecklistItemEvaluation[];
  done: ChecklistItemEvaluation[];
}

const hasAssignees = (task: Task) => (task.assignees?.length ?? 0) > 0;
const hasDescription = (task: Task) => Boolean(task.description && task.description.trim().length > 0);
const hasAttachmentsOrLinks = (task: Task) => (task.files?.length ?? 0) > 0 || (task.links?.length ?? 0) > 0;
const rollupComplete = (task: Task) => {
  if (task.rollup && typeof task.rollup.progress === "number") {
    return task.rollup.progress >= 100;
  }
  if (Array.isArray(task.subitems) && task.subitems.length > 0) {
    return task.subitems.every((item) => item.completed === true);
  }
  return true;
};

const isBlocked = (task: Task) => Boolean(task.blocked);

function evaluateChecklistItem(task: Task, item: ColumnChecklistItem): boolean {
  switch (item.field) {
    case "description":
      return item.invert ? !hasDescription(task) : hasDescription(task);
    case "assignees":
      return item.invert ? !hasAssignees(task) : hasAssignees(task);
    case "blocked":
      return item.invert ? !isBlocked(task) : isBlocked(task);
    case "rollupCompleted":
      return item.invert ? !rollupComplete(task) : rollupComplete(task);
    case "attachmentsOrLinks":
      return item.invert ? !hasAttachmentsOrLinks(task) : hasAttachmentsOrLinks(task);
    default:
      return false;
  }
}

export function evaluateDefinitionChecklists(
  metadata: ColumnBaseMetadata | undefined,
  task: Task
): ChecklistEvaluationResult {
  const readyItems = metadata?.checklists.ready ?? [];
  const doneItems = metadata?.checklists.done ?? [];

  return {
    ready: readyItems.map((item) => ({
      ...item,
      satisfied: evaluateChecklistItem(task, item),
    })),
    done: doneItems.map((item) => ({
      ...item,
      satisfied: evaluateChecklistItem(task, item),
    })),
  };
}

export function isDefinitionOfReadyMet(result: ChecklistEvaluationResult): boolean {
  return result.ready.every((item) => item.satisfied);
}

export function isDefinitionOfDoneMet(result: ChecklistEvaluationResult): boolean {
  return result.done.every((item) => item.satisfied);
}

export function hasBlockingDependencies(task: Task): boolean {
  if (task.blocked) return true;
  if (task.blocking_reason && task.blocking_reason.trim().length > 0) {
    return true;
  }
  if (!Array.isArray(task.relations)) {
    return false;
  }
  return task.relations.some((relation) =>
    relation.type === "blocked_by" || relation.type === "depends_on"
  );
}

export interface DependencyPolicyResult {
  blocked: boolean;
  reason: string | null;
}

export function evaluateDependencyPolicy(
  metadata: ColumnBaseMetadata | undefined,
  task: Task
): DependencyPolicyResult {
  const enforce = metadata?.blockerPolicies.enforceDependencyClearance ?? true;
  if (!enforce) {
    return { blocked: false, reason: null };
  }

  if (hasBlockingDependencies(task)) {
    const reason =
      task.blocking_reason?.trim().length
        ? task.blocking_reason
        : "Outstanding dependency must be cleared before progressing.";
    return { blocked: true, reason };
  }

  return { blocked: false, reason: null };
}
