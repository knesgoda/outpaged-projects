import { addMinutes, isBefore } from "date-fns";
import type { TaskWithDetails } from "@/types/tasks";

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

export type NotificationChannel = "email" | "slack" | "teams" | "in_app";

export type NotificationTrigger =
  | "mention"
  | "assignment"
  | "due_soon"
  | "automation_run"
  | "sla_breach"
  | "digest";

export interface NotificationChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  cadence?: "immediate" | "hourly" | "daily" | "weekly";
  windowMinutes?: number;
}

export interface NotificationTriggerConfig {
  id: string;
  label: string;
  trigger: NotificationTrigger;
  description?: string;
  channels: NotificationChannelConfig[];
  conditions?: string[];
  digestWindowMinutes?: number;
}

export interface NotificationDigestConfig {
  id: string;
  name: string;
  cadence: "daily" | "weekly";
  sendAt: string; // ISO time (HH:MM)
  channels: NotificationChannel[];
  recipients: string[];
  includeTriggers: NotificationTrigger[];
}

export interface ProjectNotificationScheme {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  triggers: NotificationTriggerConfig[];
  digests: NotificationDigestConfig[];
  updatedAt: string;
}

export interface NotificationEvent {
  id: string;
  projectId: string;
  trigger: NotificationTrigger;
  payload: Record<string, unknown>;
  channels: NotificationChannel[];
  scheduledFor: string;
  createdAt: string;
}

export interface NotificationDeliveryRecord {
  id: string;
  eventId: string;
  projectId: string;
  trigger: NotificationTrigger;
  channels: NotificationChannel[];
  deliveredAt: string;
  recipients: string[];
  summary: string;
}

export interface NotificationDigestSummary {
  digests: Array<{
    id: string;
    name: string;
    cadence: "daily" | "weekly";
    channels: NotificationChannel[];
    recipients: number;
    lastSentAt: string | null;
    nextSendAt: string;
  }>;
  recentDeliveries: NotificationDeliveryRecord[];
  upcomingAutomationRuns: AutomationRunSchedule[];
}

export interface AutomationRunSchedule {
  id: string;
  name: string;
  cadence: "hourly" | "daily" | "weekly" | "monthly";
  nextRunAt: string;
  owningAutomation: string;
  status: "scheduled" | "running" | "paused";
}

interface DueSoonRegistryEntry {
  taskId: string;
  scheduledFor: string;
}

const schemeStore = new Map<string, ProjectNotificationScheme>();
const queueStore = new Map<string, NotificationEvent[]>();
const deliveryStore = new Map<string, NotificationDeliveryRecord[]>();
const digestHistory = new Map<string, Map<string, string>>();
const automationSchedule = new Map<string, AutomationRunSchedule[]>();
const dueSoonRegistry = new Map<string, Map<string, DueSoonRegistryEntry>>();

function ensureScheme(projectId: string): ProjectNotificationScheme {
  if (!schemeStore.has(projectId)) {
    schemeStore.set(projectId, createDefaultScheme(projectId));
  }
  return schemeStore.get(projectId)!;
}

function ensureQueue(projectId: string) {
  if (!queueStore.has(projectId)) {
    queueStore.set(projectId, []);
  }
  return queueStore.get(projectId)!;
}

function ensureDeliveryLog(projectId: string) {
  if (!deliveryStore.has(projectId)) {
    deliveryStore.set(projectId, []);
  }
  return deliveryStore.get(projectId)!;
}

function ensureDigestHistory(projectId: string) {
  if (!digestHistory.has(projectId)) {
    digestHistory.set(projectId, new Map());
  }
  return digestHistory.get(projectId)!;
}

function ensureDueSoonRegistry(projectId: string) {
  if (!dueSoonRegistry.has(projectId)) {
    dueSoonRegistry.set(projectId, new Map());
  }
  return dueSoonRegistry.get(projectId)!;
}

function ensureAutomationSchedule(projectId: string) {
  if (!automationSchedule.has(projectId)) {
    automationSchedule.set(projectId, createDefaultAutomationRuns(projectId));
  }
  return automationSchedule.get(projectId)!;
}

function createDefaultAutomationRuns(projectId: string): AutomationRunSchedule[] {
  const now = new Date();
  return [
    {
      id: generateId("automation"),
      name: "Daily stand-up digest",
      cadence: "daily",
      nextRunAt: addMinutes(now, 90).toISOString(),
      owningAutomation: `${projectId}:daily-digest`,
      status: "scheduled",
    },
    {
      id: generateId("automation"),
      name: "SLA breach escalations",
      cadence: "hourly",
      nextRunAt: addMinutes(now, 45).toISOString(),
      owningAutomation: `${projectId}:sla-escalation`,
      status: "scheduled",
    },
    {
      id: generateId("automation"),
      name: "Weekly project briefing",
      cadence: "weekly",
      nextRunAt: addMinutes(now, 60 * 24 * 3).toISOString(),
      owningAutomation: `${projectId}:weekly-briefing`,
      status: "scheduled",
    },
  ];
}

function createDefaultScheme(projectId: string): ProjectNotificationScheme {
  const now = new Date().toISOString();
  return {
    id: generateId("scheme"),
    projectId,
    name: "Project defaults",
    description: "Out-of-the-box delivery rules for project activity",
    updatedAt: now,
    triggers: [
      {
        id: "mentions",
        label: "Mentions",
        trigger: "mention",
        description: "Real-time alerts when teammates mention you in tasks or comments.",
        channels: [
          { channel: "in_app", enabled: true, cadence: "immediate" },
          { channel: "email", enabled: true, cadence: "immediate" },
          { channel: "slack", enabled: true, cadence: "immediate" },
        ],
      },
      {
        id: "assignments",
        label: "Assignments",
        trigger: "assignment",
        description: "Notify assignees when they are added to work.",
        channels: [
          { channel: "in_app", enabled: true, cadence: "immediate" },
          { channel: "email", enabled: false, cadence: "immediate" },
          { channel: "teams", enabled: false, cadence: "immediate" },
        ],
      },
      {
        id: "due-soon",
        label: "Due soon",
        trigger: "due_soon",
        description: "Surface upcoming due dates to owners and followers.",
        channels: [
          { channel: "in_app", enabled: true, cadence: "daily", windowMinutes: 60 * 24 },
          { channel: "email", enabled: true, cadence: "daily", windowMinutes: 60 * 24 },
          { channel: "slack", enabled: true, cadence: "daily", windowMinutes: 60 * 12 },
        ],
        digestWindowMinutes: 60 * 24,
      },
      {
        id: "automation-runs",
        label: "Automation runs",
        trigger: "automation_run",
        description: "Summaries of automation executions and failures.",
        channels: [
          { channel: "in_app", enabled: true, cadence: "hourly" },
          { channel: "slack", enabled: true, cadence: "hourly" },
          { channel: "email", enabled: false, cadence: "daily" },
        ],
      },
      {
        id: "sla-breaches",
        label: "SLA breaches",
        trigger: "sla_breach",
        description: "Escalations when service level targets are missed.",
        channels: [
          { channel: "slack", enabled: true, cadence: "immediate" },
          { channel: "teams", enabled: true, cadence: "immediate" },
          { channel: "email", enabled: true, cadence: "immediate" },
        ],
      },
    ],
    digests: [
      {
        id: "daily-digest",
        name: "Daily roll-up",
        cadence: "daily",
        sendAt: "08:00",
        channels: ["email", "slack"],
        recipients: ["project_owner", "team_leads"],
        includeTriggers: ["due_soon", "automation_run", "sla_breach"],
      },
      {
        id: "weekly-insights",
        name: "Weekly insights",
        cadence: "weekly",
        sendAt: "Monday 09:00",
        channels: ["email"],
        recipients: ["stakeholders"],
        includeTriggers: ["assignment", "sla_breach", "digest"],
      },
    ],
  } satisfies ProjectNotificationScheme;
}

export function getNotificationScheme(projectId: string): ProjectNotificationScheme {
  return deepClone(ensureScheme(projectId));
}

export function updateNotificationChannel(
  projectId: string,
  triggerId: string,
  channel: NotificationChannel,
  enabled: boolean,
): ProjectNotificationScheme {
  const scheme = ensureScheme(projectId);
  const trigger = scheme.triggers.find((entry) => entry.id === triggerId);
  if (!trigger) {
    throw new Error(`Trigger ${triggerId} not found`);
  }
  const channelEntry = trigger.channels.find((item) => item.channel === channel);
  if (!channelEntry) {
    trigger.channels.push({ channel, enabled });
  } else {
    channelEntry.enabled = enabled;
  }
  scheme.updatedAt = new Date().toISOString();
  return getNotificationScheme(projectId);
}

export function updateDigestChannels(
  projectId: string,
  digestId: string,
  channels: NotificationChannel[],
): ProjectNotificationScheme {
  const scheme = ensureScheme(projectId);
  const digest = scheme.digests.find((entry) => entry.id === digestId);
  if (!digest) {
    throw new Error(`Digest ${digestId} not found`);
  }
  digest.channels = channels;
  scheme.updatedAt = new Date().toISOString();
  return getNotificationScheme(projectId);
}

export function enqueueNotificationEvent(
  projectId: string,
  trigger: NotificationTrigger,
  payload: Record<string, unknown>,
  options?: { channels?: NotificationChannel[]; scheduledFor?: Date | string },
): NotificationEvent {
  const scheme = ensureScheme(projectId);
  const configuredChannels = scheme.triggers
    .find((entry) => entry.trigger === trigger)?.channels
    .filter((entry) => entry.enabled)
    .map((entry) => entry.channel) ?? ["in_app"];

  const event: NotificationEvent = {
    id: generateId("event"),
    projectId,
    trigger,
    payload,
    channels: options?.channels ?? configuredChannels,
    scheduledFor: options?.scheduledFor
      ? typeof options.scheduledFor === "string"
        ? options.scheduledFor
        : options.scheduledFor.toISOString()
      : new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  ensureQueue(projectId).push(event);
  return event;
}

export function processNotificationQueue(projectId: string, now = new Date()): NotificationDeliveryRecord[] {
  const queue = ensureQueue(projectId);
  if (queue.length === 0) {
    return [];
  }

  const remaining: NotificationEvent[] = [];
  const processed: NotificationDeliveryRecord[] = [];

  for (const event of queue) {
    if (isBefore(new Date(event.scheduledFor), addMinutes(now, 1))) {
      const delivery: NotificationDeliveryRecord = {
        id: generateId("delivery"),
        eventId: event.id,
        projectId: event.projectId,
        trigger: event.trigger,
        channels: event.channels,
        deliveredAt: now.toISOString(),
        recipients: deriveRecipients(event),
        summary: summarizeEvent(event),
      };
      ensureDeliveryLog(projectId).push(delivery);
      processed.push(delivery);
    } else {
      remaining.push(event);
    }
  }

  queueStore.set(projectId, remaining);

  for (const digest of ensureScheme(projectId).digests) {
    if (!shouldSendDigest(projectId, digest, now)) {
      continue;
    }
    const digestEvent = enqueueNotificationEvent(
      projectId,
      "digest",
      {
        digestId: digest.id,
        includeTriggers: digest.includeTriggers,
      },
      { channels: digest.channels },
    );
    const delivery: NotificationDeliveryRecord = {
      id: generateId("delivery"),
      eventId: digestEvent.id,
      projectId,
      trigger: "digest",
      channels: digest.channels,
      deliveredAt: now.toISOString(),
      recipients: digest.recipients,
      summary: `Sent ${digest.name}`,
    };
    ensureDeliveryLog(projectId).push(delivery);
    ensureDigestHistory(projectId).set(digest.id, now.toISOString());
  }

  return processed;
}

function deriveRecipients(event: NotificationEvent): string[] {
  if (typeof event.payload.recipients === "string") {
    return [event.payload.recipients];
  }
  if (Array.isArray(event.payload.recipients)) {
    return event.payload.recipients.filter((value): value is string => typeof value === "string");
  }
  if (typeof event.payload.assigneeId === "string") {
    return [event.payload.assigneeId];
  }
  return ["project_team"];
}

function summarizeEvent(event: NotificationEvent): string {
  switch (event.trigger) {
    case "mention":
      return `Mentioned ${event.payload.target ?? "user"}`;
    case "assignment":
      return `Assigned task ${(event.payload.taskTitle as string) ?? ""}`.trim();
    case "due_soon":
      return `Due soon: ${(event.payload.taskTitle as string) ?? event.payload.taskId}`;
    case "automation_run":
      return `Automation ${(event.payload.automationName as string) ?? "run"}`;
    case "sla_breach":
      return `SLA breach on ${(event.payload.taskTitle as string) ?? event.payload.taskId}`;
    case "digest":
      return `Digest ${(event.payload.digestId as string) ?? ""}`.trim();
    default:
      return "Notification";
  }
}

function shouldSendDigest(
  projectId: string,
  digest: NotificationDigestConfig,
  now: Date,
): boolean {
  const history = ensureDigestHistory(projectId);
  const lastSent = history.get(digest.id);
  if (!lastSent) {
    return true;
  }
  const cadenceMinutes = digest.cadence === "daily" ? 60 * 24 : 60 * 24 * 7;
  const next = addMinutes(new Date(lastSent), cadenceMinutes - 5);
  return isBefore(next, now);
}

export function registerDueSoonNotifications(projectId: string, tasks: TaskWithDetails[]) {
  const registry = ensureDueSoonRegistry(projectId);
  const now = new Date();
  const soonThreshold = addMinutes(now, 60 * 24 * 3);
  for (const task of tasks) {
    if (!task.due_date || task.completed_at) continue;
    const dueDate = new Date(task.due_date);
    if (dueDate < now || dueDate > soonThreshold) continue;
    if (registry.has(task.id)) continue;
    const event = enqueueNotificationEvent(projectId, "due_soon", {
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.due_date,
      recipients: task.assignees?.map((assignee) => assignee.id) ?? [],
    });
    registry.set(task.id, { taskId: task.id, scheduledFor: event.scheduledFor });
  }
}

export function registerAutomationRun(
  projectId: string,
  automation: Partial<AutomationRunSchedule> & { name: string },
) {
  const runs = ensureAutomationSchedule(projectId);
  const run: AutomationRunSchedule = {
    id: automation.id ?? generateId("automation"),
    name: automation.name,
    cadence: automation.cadence ?? "daily",
    nextRunAt: automation.nextRunAt ?? addMinutes(new Date(), 60).toISOString(),
    owningAutomation: automation.owningAutomation ?? `${projectId}:${automation.name}`,
    status: automation.status ?? "scheduled",
  };
  runs.push(run);
  enqueueNotificationEvent(projectId, "automation_run", {
    automationName: run.name,
    cadence: run.cadence,
  });
}

export function getNotificationDeliveryLog(
  projectId: string,
  limit = 50,
): NotificationDeliveryRecord[] {
  const entries = ensureDeliveryLog(projectId);
  return deepClone(entries.slice(-limit).reverse());
}

export function getNotificationDigestSummary(projectId: string): NotificationDigestSummary {
  const scheme = ensureScheme(projectId);
  const deliveries = getNotificationDeliveryLog(projectId, 10);
  const runs = ensureAutomationSchedule(projectId);
  const digestHistoryMap = ensureDigestHistory(projectId);
  const digests = scheme.digests.map((digest) => ({
    id: digest.id,
    name: digest.name,
    cadence: digest.cadence,
    channels: [...digest.channels],
    recipients: digest.recipients.length,
    lastSentAt: digestHistoryMap.get(digest.id) ?? null,
    nextSendAt: computeNextDigestSendTime(projectId, digest),
  }));
  return {
    digests,
    recentDeliveries: deliveries,
    upcomingAutomationRuns: deepClone(runs).sort((a, b) =>
      new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime(),
    ),
  };
}

function computeNextDigestSendTime(projectId: string, digest: NotificationDigestConfig): string {
  const history = ensureDigestHistory(projectId);
  const lastSent = history.get(digest.id);
  const cadenceMinutes = digest.cadence === "daily" ? 60 * 24 : 60 * 24 * 7;
  if (!lastSent) {
    const today = new Date();
    const [rawHour, rawMinute] = digest.sendAt.split(":");
    const parsedHour = Number.parseInt(rawHour?.split(/\s+/).pop() ?? "", 10);
    const parsedMinute = Number.parseInt(rawMinute ?? "0", 10);
    const hour = Number.isFinite(parsedHour) ? parsedHour : 8;
    const minute = Number.isFinite(parsedMinute) ? parsedMinute : 0;
    today.setHours(hour, minute, 0, 0);
    return today.toISOString();
  }
  const next = addMinutes(new Date(lastSent), cadenceMinutes);
  return next.toISOString();
}

export function resetProjectNotifications(projectId: string) {
  schemeStore.delete(projectId);
  queueStore.delete(projectId);
  deliveryStore.delete(projectId);
  digestHistory.delete(projectId);
  dueSoonRegistry.delete(projectId);
  automationSchedule.delete(projectId);
}

