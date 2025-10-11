import { differenceInMinutes } from "date-fns";
import type { TaskWithDetails, TaskPriority, TaskStatus } from "@/types/tasks";
import {
  enqueueNotificationEvent,
  type NotificationChannel,
} from "./projectNotificationService";

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function generateId(prefix: string) {
  if (typeof crypto?.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export type SLATargetType = "response" | "resolution" | "update";

export type SLATargetStatus = "on_track" | "at_risk" | "breached" | "met";

export interface SLATarget {
  id: string;
  type: SLATargetType;
  durationMinutes: number;
  warningThresholdPercent?: number; // defaults to 0.25 (25% of time remaining)
  appliesToStatuses?: TaskStatus[];
}

export interface SLAPauseRule {
  id: string;
  reason: string;
  type: "status" | "blocked" | "customField";
  fieldKey?: string;
  values?: string[];
}

export interface SLAPolicyFilter {
  priorities?: TaskPriority[];
  statuses?: TaskStatus[];
  customFieldMatches?: Record<string, string | string[]>;
}

export interface SLAPolicy {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  active: boolean;
  targets: SLATarget[];
  pauseWhen?: SLAPauseRule[];
  resumeWhen?: SLAPauseRule[];
  filter?: SLAPolicyFilter;
  notificationChannels: NotificationChannel[];
  updatedAt: string;
}

export interface SLATargetEvaluation {
  targetId: string;
  type: SLATargetType;
  status: SLATargetStatus;
  durationMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  pausedMinutes: number;
}

export interface SLAPolicyEvaluation {
  policyId: string;
  policyName: string;
  active: boolean;
  totalTasks: number;
  onTrack: number;
  atRisk: number;
  breached: number;
  met: number;
  evaluations: Record<string, SLATargetEvaluation>;
}

export interface SLABreachRecord {
  id: string;
  policyId: string;
  taskId: string;
  taskTitle: string;
  occurredAt: string;
  targetId: string;
  status: SLATargetType;
}

export interface SLAHealthSnapshot {
  generatedAt: string;
  policies: SLAPolicyEvaluation[];
  totals: {
    onTrack: number;
    atRisk: number;
    breached: number;
    met: number;
  };
  breaches: SLABreachRecord[];
}

interface SLATaskState {
  taskId: string;
  policyId: string;
  breachedTargets: Set<string>;
  pausedMinutes: number;
  lastCheckedAt?: string;
  lastStatus?: TaskStatus;
}

const policyStore = new Map<string, SLAPolicy[]>();
const evaluationStateStore = new Map<string, Map<string, SLATaskState>>();
const breachLogStore = new Map<string, SLABreachRecord[]>();
const lastSnapshotStore = new Map<string, SLAHealthSnapshot>();

function ensurePolicies(projectId: string): SLAPolicy[] {
  if (!policyStore.has(projectId)) {
    policyStore.set(projectId, createDefaultPolicies(projectId));
  }
  return policyStore.get(projectId)!;
}

function ensureTaskState(projectId: string): Map<string, SLATaskState> {
  if (!evaluationStateStore.has(projectId)) {
    evaluationStateStore.set(projectId, new Map());
  }
  return evaluationStateStore.get(projectId)!;
}

function ensureBreachLog(projectId: string) {
  if (!breachLogStore.has(projectId)) {
    breachLogStore.set(projectId, []);
  }
  return breachLogStore.get(projectId)!;
}

function createDefaultPolicies(projectId: string): SLAPolicy[] {
  const now = new Date().toISOString();
  return [
    {
      id: generateId("sla"),
      projectId,
      name: "High priority response",
      description: "Respond to urgent work within four hours.",
      active: true,
      targets: [
        {
          id: "response",
          type: "response",
          durationMinutes: 60 * 4,
          warningThresholdPercent: 0.25,
        },
      ],
      pauseWhen: [
        { id: "waiting", reason: "Waiting on customer", type: "status", values: ["waiting"] },
        { id: "blocked", reason: "Task is blocked", type: "blocked" },
      ],
      filter: {
        priorities: ["urgent", "high"],
      },
      notificationChannels: ["slack", "email"],
      updatedAt: now,
    },
    {
      id: generateId("sla"),
      projectId,
      name: "Resolution target",
      description: "Resolve work within two business days.",
      active: true,
      targets: [
        {
          id: "resolution",
          type: "resolution",
          durationMinutes: 60 * 24 * 2,
          warningThresholdPercent: 0.2,
        },
      ],
      pauseWhen: [
        { id: "blocked", reason: "Blocked work", type: "blocked" },
        {
          id: "external",
          reason: "Waiting on partner",
          type: "customField",
          fieldKey: "dependency_type",
          values: ["external_dependency", "customer"],
        },
      ],
      resumeWhen: [
        { id: "resumed", reason: "Resumed", type: "status", values: ["in_progress"] },
      ],
      notificationChannels: ["teams", "email"],
      updatedAt: now,
    },
  ];
}

function taskMatchesPolicy(task: TaskWithDetails, policy: SLAPolicy): boolean {
  if (!policy.filter) return true;
  const { priorities, statuses, customFieldMatches } = policy.filter;
  if (priorities && priorities.length > 0 && !priorities.includes(task.priority)) {
    return false;
  }
  if (statuses && statuses.length > 0 && !statuses.includes(task.status)) {
    return false;
  }
  if (customFieldMatches) {
    for (const [field, expected] of Object.entries(customFieldMatches)) {
      const value = task.customFields?.[field];
      if (Array.isArray(expected)) {
        if (!expected.includes(String(value ?? ""))) {
          return false;
        }
      } else if (String(value ?? "") !== String(expected)) {
        return false;
      }
    }
  }
  return true;
}

function isTaskPaused(task: TaskWithDetails, policy: SLAPolicy): boolean {
  const pauseRules = policy.pauseWhen ?? [];
  if (pauseRules.length === 0) {
    return false;
  }
  for (const rule of pauseRules) {
    if (rule.type === "blocked" && task.blocked) {
      return true;
    }
    if (rule.type === "status" && rule.values?.includes(task.status)) {
      return true;
    }
    if (rule.type === "customField" && rule.values) {
      const fieldKey = rule.fieldKey ?? rule.values[0];
      const value = fieldKey ? task.customFields?.[fieldKey] : undefined;
      if (value && rule.values.map(String).includes(String(value))) {
        return true;
      }
    }
  }
  return false;
}

function shouldResumeFromPause(task: TaskWithDetails, policy: SLAPolicy): boolean {
  const resumeRules = policy.resumeWhen ?? [];
  if (resumeRules.length === 0) {
    return false;
  }
  return resumeRules.some((rule) => {
    if (rule.type === "status" && rule.values?.includes(task.status)) {
      return true;
    }
    if (rule.type === "blocked" && !task.blocked) {
      return true;
    }
    if (rule.type === "customField" && rule.values) {
      const fieldKey = rule.fieldKey ?? rule.values[0];
      const value = fieldKey ? task.customFields?.[fieldKey] : undefined;
      return value === "active";
    }
    return false;
  });
}

function getOrCreateTaskState(projectId: string, policyId: string, taskId: string): SLATaskState {
  const stateStore = ensureTaskState(projectId);
  const key = `${policyId}:${taskId}`;
  if (!stateStore.has(key)) {
    stateStore.set(key, {
      taskId,
      policyId,
      breachedTargets: new Set(),
      pausedMinutes: 0,
    });
  }
  return stateStore.get(key)!;
}

function calculateElapsedMinutes(task: TaskWithDetails, now: Date): number {
  const startedAt = task.created_at ? new Date(task.created_at) : new Date(task.updated_at ?? now);
  if (task.completed_at) {
    return Math.max(0, differenceInMinutes(new Date(task.completed_at), startedAt));
  }
  return Math.max(0, differenceInMinutes(now, startedAt));
}

function evaluateTarget(
  task: TaskWithDetails,
  policy: SLAPolicy,
  target: SLATarget,
  state: SLATaskState,
  now: Date,
): SLATargetEvaluation {
  const totalElapsed = calculateElapsedMinutes(task, now);
  let pausedMinutes = state.pausedMinutes;
  const paused = isTaskPaused(task, policy);
  if (paused && state.lastCheckedAt) {
    pausedMinutes += Math.max(0, differenceInMinutes(now, new Date(state.lastCheckedAt)));
  }
  if (!paused && shouldResumeFromPause(task, policy)) {
    pausedMinutes = 0;
  }
  const effectiveElapsed = Math.max(0, totalElapsed - pausedMinutes);
  const remainingMinutes = target.durationMinutes - effectiveElapsed;

  let status: SLATargetStatus = "on_track";
  if (task.completed_at) {
    status = effectiveElapsed <= target.durationMinutes ? "met" : "breached";
  } else if (remainingMinutes <= 0) {
    status = "breached";
  } else {
    const warningThreshold = target.warningThresholdPercent ?? 0.25;
    const thresholdMinutes = target.durationMinutes * warningThreshold;
    status = remainingMinutes <= thresholdMinutes ? "at_risk" : "on_track";
  }

  return {
    targetId: target.id,
    type: target.type,
    status,
    durationMinutes: target.durationMinutes,
    elapsedMinutes: effectiveElapsed,
    remainingMinutes,
    pausedMinutes,
  };
}

function recordBreach(
  projectId: string,
  policy: SLAPolicy,
  task: TaskWithDetails,
  evaluation: SLATargetEvaluation,
  now: Date,
) {
  const log = ensureBreachLog(projectId);
  const breach: SLABreachRecord = {
    id: generateId("breach"),
    policyId: policy.id,
    taskId: task.id,
    taskTitle: task.title ?? "Untitled task",
    occurredAt: now.toISOString(),
    targetId: evaluation.targetId,
    status: evaluation.type,
  };
  log.push(breach);

  enqueueNotificationEvent(
    projectId,
    "sla_breach",
    {
      taskId: task.id,
      taskTitle: task.title,
      policyId: policy.id,
      targetId: evaluation.targetId,
      elapsedMinutes: evaluation.elapsedMinutes,
    },
    { channels: policy.notificationChannels },
  );
}

export function listSLAPolicies(projectId: string): SLAPolicy[] {
  return deepClone(ensurePolicies(projectId));
}

export function upsertSLAPolicy(projectId: string, policy: Partial<SLAPolicy> & { id?: string }): SLAPolicy {
  const policies = ensurePolicies(projectId);
  const now = new Date().toISOString();
  if (policy.id) {
    const existingIndex = policies.findIndex((entry) => entry.id === policy.id);
    if (existingIndex === -1) {
      throw new Error(`SLA policy ${policy.id} not found`);
    }
    policies[existingIndex] = {
      ...policies[existingIndex],
      ...policy,
      updatedAt: now,
    } as SLAPolicy;
    return deepClone(policies[existingIndex]);
  }
  const created: SLAPolicy = {
    id: generateId("sla"),
    projectId,
    name: policy.name ?? "New SLA",
    description: policy.description,
    active: policy.active ?? true,
    targets: policy.targets ?? [],
    pauseWhen: policy.pauseWhen ?? [],
    resumeWhen: policy.resumeWhen ?? [],
    filter: policy.filter,
    notificationChannels: policy.notificationChannels ?? ["email"],
    updatedAt: now,
  };
  policies.push(created);
  return deepClone(created);
}

export function evaluateProjectSLA(
  projectId: string,
  tasks: TaskWithDetails[],
  now = new Date(),
): SLAHealthSnapshot {
  const policies = ensurePolicies(projectId).filter((policy) => policy.active);
  const stateStore = ensureTaskState(projectId);
  const totals = { onTrack: 0, atRisk: 0, breached: 0, met: 0 };
  const policyEvaluations: SLAPolicyEvaluation[] = [];

  for (const policy of policies) {
    let onTrack = 0;
    let atRisk = 0;
    let breached = 0;
    let met = 0;
    let totalTasks = 0;
    const evaluations: Record<string, SLATargetEvaluation> = {};

    for (const task of tasks) {
      if (!taskMatchesPolicy(task, policy)) {
        continue;
      }
      totalTasks += 1;
      const state = getOrCreateTaskState(projectId, policy.id, task.id);
      const target = policy.targets[0];
      if (!target) continue;
      const evaluation = evaluateTarget(task, policy, target, state, now);
      evaluations[task.id] = evaluation;

      if (evaluation.status === "breached" && !state.breachedTargets.has(target.id)) {
        recordBreach(projectId, policy, task, evaluation, now);
        state.breachedTargets.add(target.id);
      }
      if (evaluation.status === "met") {
        met += 1;
      } else if (evaluation.status === "breached") {
        breached += 1;
      } else if (evaluation.status === "at_risk") {
        atRisk += 1;
      } else {
        onTrack += 1;
      }
      state.pausedMinutes = evaluation.pausedMinutes;
      state.lastCheckedAt = now.toISOString();
      state.lastStatus = task.status;
    }

    totals.onTrack += onTrack;
    totals.atRisk += atRisk;
    totals.breached += breached;
    totals.met += met;

    policyEvaluations.push({
      policyId: policy.id,
      policyName: policy.name,
      active: policy.active,
      totalTasks,
      onTrack,
      atRisk,
      breached,
      met,
      evaluations,
    });
  }

  const snapshot: SLAHealthSnapshot = {
    generatedAt: now.toISOString(),
    policies: policyEvaluations,
    totals,
    breaches: deepClone(ensureBreachLog(projectId).slice(-50)),
  };

  lastSnapshotStore.set(projectId, snapshot);
  return snapshot;
}

export function getLastSLAHealthSnapshot(projectId: string): SLAHealthSnapshot | null {
  return lastSnapshotStore.has(projectId) ? deepClone(lastSnapshotStore.get(projectId)!) : null;
}

export function getSLABreachLog(projectId: string): SLABreachRecord[] {
  return deepClone(ensureBreachLog(projectId));
}

export function resetProjectSLA(projectId: string) {
  policyStore.delete(projectId);
  evaluationStateStore.delete(projectId);
  breachLogStore.delete(projectId);
  lastSnapshotStore.delete(projectId);
}
