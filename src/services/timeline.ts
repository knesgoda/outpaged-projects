// @ts-nocheck
import { addDays, addHours, formatISO, startOfDay } from "date-fns";

import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import type {
  TimelineBaseline,
  TimelineDependency,
  TimelineGroup,
  TimelineItem,
  TimelineMilestone,
  TimelineOverlay,
  TimelineSnapshot,
  TimelineViewPreferences,
  TimelineWorkloadMetric,
} from "@/state/timeline";

export interface TimelineFetchOptions {
  projectId?: string;
  savedViewId?: string;
  filters?: Record<string, unknown>;
}

function buildMockTimelineSnapshot(options: TimelineFetchOptions = {}): TimelineSnapshot {
  const today = startOfDay(new Date());
  const base = options.projectId ?? "demo-project";
  const items: TimelineItem[] = [
    {
      id: `${base}-task-1`,
      name: "Define scope",
      kind: "task",
      start: formatISO(addDays(today, -3)),
      end: formatISO(addDays(today, 2)),
      durationMinutes: 5 * 24 * 60,
      percentComplete: 0.8,
      status: "in_progress",
      assigneeIds: ["user-1"],
      groupId: `${base}-group-discovery`,
      tags: ["critical"],
    },
    {
      id: `${base}-task-2`,
      name: "Design review",
      kind: "task",
      start: formatISO(addDays(today, 2)),
      end: formatISO(addDays(today, 6)),
      durationMinutes: 4 * 24 * 60,
      percentComplete: 0.35,
      status: "planned",
      assigneeIds: ["user-2"],
      groupId: `${base}-group-discovery`,
      tags: ["design"],
    },
    {
      id: `${base}-task-3`,
      name: "Build prototype",
      kind: "task",
      start: formatISO(addDays(today, 6)),
      end: formatISO(addDays(today, 13)),
      durationMinutes: 7 * 24 * 60,
      percentComplete: 0.1,
      status: "not_started",
      assigneeIds: ["user-3"],
      groupId: `${base}-group-build`,
      tags: ["engineering"],
    },
    {
      id: `${base}-task-4`,
      name: "Launch prep",
      kind: "task",
      start: formatISO(addDays(today, 13)),
      end: formatISO(addDays(today, 18)),
      durationMinutes: 5 * 24 * 60,
      percentComplete: 0,
      status: "not_started",
      assigneeIds: ["user-1", "user-4"],
      groupId: `${base}-group-launch`,
      tags: ["go-to-market"],
    },
  ];

  const groups: TimelineGroup[] = [
    { id: `${base}-group-discovery`, name: "Discovery", parentId: null, orderIndex: 0 },
    { id: `${base}-group-build`, name: "Build", parentId: null, orderIndex: 1 },
    { id: `${base}-group-launch`, name: "Launch", parentId: null, orderIndex: 2 },
  ];

  const milestones: TimelineMilestone[] = [
    {
      id: `${base}-gate-alpha`,
      name: "Alpha exit",
      type: "gate",
      date: formatISO(addDays(today, 6)),
      relatedItemIds: [`${base}-task-3`],
    },
    {
      id: `${base}-release`,
      name: "Release",
      type: "release",
      date: formatISO(addDays(today, 18)),
      relatedItemIds: [`${base}-task-4`],
    },
  ];

  const dependencies: TimelineDependency[] = [
    { id: `${base}-dep-1`, fromId: `${base}-task-1`, toId: `${base}-task-2`, type: "FS" },
    { id: `${base}-dep-2`, fromId: `${base}-task-2`, toId: `${base}-task-3`, type: "FS" },
    { id: `${base}-dep-3`, fromId: `${base}-task-3`, toId: `${base}-task-4`, type: "FS" },
  ];

  const baselines: TimelineBaseline[] = [
    {
      id: `${base}-baseline-1`,
      itemId: `${base}-task-3`,
      start: formatISO(addDays(today, 5)),
      end: formatISO(addDays(today, 11)),
      durationMinutes: 6 * 24 * 60,
      varianceMinutes: 24 * 60,
    },
  ];

  const overlays: TimelineOverlay[] = [
    {
      id: `${base}-risk-overlay`,
      name: "Risk",
      type: "risk",
      data: items.map(item => ({ itemId: item.id, value: Math.round((item.riskScore ?? Math.random() * 5) * 10) / 10 })),
    },
  ];

  const workload: TimelineWorkloadMetric[] = items.flatMap(item =>
    (item.assigneeIds ?? []).map((assigneeId, index) => ({
      itemId: item.id,
      personId: assigneeId,
      allocationMinutes: (item.durationMinutes ?? 0) / Math.max(1, item.assigneeIds?.length ?? 1) * (index === 0 ? 1 : 0.75),
    }))
  );

  const nowIso = formatISO(addHours(today, 9));
  const preferences: TimelineViewPreferences = {
    scale: "day",
    zoomLevel: 1,
    showWeekends: true,
    showBaselines: true,
    showDependencies: true,
    showOverlays: false,
    showLegend: false,
    snapMode: "day",
    rowDensity: "comfortable",
    grouping: "none",
    colorBy: "status",
    swimlanes: false,
    calendarId: null,
    savedViewId: options.savedViewId ?? null,
  };

  return {
    items,
    groups,
    milestones,
    dependencies,
    baselines,
    constraints: [],
    calendars: [
      {
        id: "default-calendar",
        name: "Default",
        timezone: "UTC",
        workingDays: [1, 2, 3, 4, 5],
        workingHours: [
          { start: "09:00", end: "12:00" },
          { start: "13:00", end: "17:00" },
        ],
      },
    ],
    overlays,
    workload,
    riskScores: items.map(item => ({ itemId: item.id, score: Math.random() * 5 })),
    comments: [
      {
        id: `${base}-comment-1`,
        itemId: `${base}-task-2`,
        authorId: "user-1",
        message: "Waiting on design sign-off",
        createdAt: nowIso,
      },
    ],
    permissions: items.map(item => ({
      itemId: item.id,
      actorId: "current-user",
      canEdit: true,
      canComment: true,
      canLinkDependencies: true,
    })),
    presence: items.map(item => ({
      itemId: item.id,
      userId: "current-user",
      updatedAt: nowIso,
      cursor: { x: 0, y: 0 },
    })),
    preferences,
    metadata: {
      filters: options.filters ?? {},
    },
    lastUpdated: nowIso,
  };
}

export async function fetchTimelineSnapshot(options: TimelineFetchOptions = {}): Promise<TimelineSnapshot> {
  if (supabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("get_timeline_snapshot", {
        project_id: options.projectId ?? null,
        saved_view_id: options.savedViewId ?? null,
        filters: options.filters ?? null,
      });

      if (error) {
        console.warn("Failed to load timeline snapshot from Supabase", error);
      } else if (data) {
        return {
          ...buildMockTimelineSnapshot(options),
          ...(data as Partial<TimelineSnapshot>),
        } as TimelineSnapshot;
      }
    } catch (error) {
      console.warn("Timeline Supabase RPC unavailable, using mock snapshot", error);
    }
  }

  return buildMockTimelineSnapshot(options);
}
