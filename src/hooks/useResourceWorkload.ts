import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  differenceInBusinessDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  isAfter,
  isBefore,
  max,
  min,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns";

import { supabase } from "@/integrations/supabase/client";

type OptionalString = string | null | undefined;

export type ResourceTimeframe = "week" | "month" | "quarter";

export interface ResourceAssignment {
  taskId: string;
  title: string;
  estimatedHours: number;
  dueDate: OptionalString;
  priority?: OptionalString;
  status?: OptionalString;
  projectName?: OptionalString;
}

export interface SkillSummary {
  skill: string;
  experiencePoints: number;
  level?: number | null;
}

export interface ResourceWorkload {
  userId: string;
  fullName: string;
  avatarUrl: OptionalString;
  baseCapacityHours: number;
  availableHours: number;
  busyHours: number;
  oooHours: number;
  taskHours: number;
  taskCount: number;
  urgentTaskCount: number;
  completionRate: number;
  utilization: number;
  assignments: ResourceAssignment[];
  skills: SkillSummary[];
  oooWindows: Array<{ start: string; end: string }>;
}

interface WorkloadHookState {
  data: ResourceWorkload[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

const BUSINESS_HOURS_PER_DAY = 8;

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, value));
}

function computeRange(timeframe: ResourceTimeframe) {
  const now = new Date();
  switch (timeframe) {
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case "month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case "quarter":
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
      };
    default:
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
  }
}

function hoursBetween(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime();
  return diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
}

function overlapHours(rangeStart: Date, rangeEnd: Date, startIso: OptionalString, endIso: OptionalString) {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isBefore(end, rangeStart) || isAfter(start, rangeEnd)) {
    return 0;
  }
  const overlapStart = max([rangeStart, start]);
  const overlapEnd = min([rangeEnd, end]);
  return hoursBetween(overlapStart, overlapEnd);
}

function normaliseAvailabilityLabel(event: Record<string, unknown>) {
  const raw =
    (event["availability_type"] as OptionalString) ??
    (event["event_type"] as OptionalString) ??
    (event["type"] as OptionalString) ??
    (event["status"] as OptionalString) ??
    "busy";
  return (raw ?? "busy").toString().toLowerCase();
}

function isBusyEvent(event: Record<string, unknown>) {
  const label = normaliseAvailabilityLabel(event);
  return !["free", "ooo", "out_of_office", "availability"].includes(label);
}

function isUrgentTask(assignment: ResourceAssignment, rangeStart: Date) {
  const priority = (assignment.priority ?? "").toLowerCase();
  if (priority === "urgent" || priority === "high") return true;
  if (!assignment.dueDate) return false;
  const due = new Date(assignment.dueDate);
  return !isAfter(due, addDays(rangeStart, 7));
}

export function useResourceWorkload(projectId: OptionalString, timeframe: ResourceTimeframe) {
  const [{ data, error, lastUpdated, loading }, setState] = useState<WorkloadHookState>({
    data: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const range = useMemo(() => computeRange(timeframe), [timeframe]);

  const refresh = useCallback(async () => {
    if (!projectId) {
      // allow undefined to fetch across all projects
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const memberQuery = supabase
        .from("project_members_with_profiles")
        .select("user_id, full_name, avatar_url, project_id");

      if (projectId) {
        memberQuery.eq("project_id", projectId);
      }

      const { data: members, error: membersError } = await memberQuery;
      if (membersError) throw membersError;

      const taskQuery = supabase
        .from("tasks")
        .select(
          `
            id,
            title,
            status,
            priority,
            due_date,
            estimated_hours,
            project_id,
            project:projects(name),
            assignees:task_assignees(user_id)
          `
        )
        .gte("due_date", range.start.toISOString())
        .lte("due_date", range.end.toISOString());

      if (projectId) {
        taskQuery.eq("project_id", projectId);
      }

      const { data: tasks, error: tasksError } = await taskQuery;
      if (tasksError) throw tasksError;

      // Note: calendar_events and ooo_events tables need to be created in database
      console.log("Loading calendar events (tables not yet created)");
      const resolvedCalendarEvents: any[] = [];
      const resolvedOOOEvents: any[] = [];

      const { data: skills, error: skillsError } = await supabase
        .from("skill_development")
        .select("user_id, skill_name, experience_points, current_level");

      if (skillsError) throw skillsError;

      const memberMap = new Map<string, { fullName: string; avatarUrl: OptionalString }>();
      members?.forEach((member: any) => {
        if (!member?.user_id) return;
        memberMap.set(member.user_id, {
          fullName: member.full_name ?? "Unknown",
          avatarUrl: member.avatar_url ?? null,
        });
      });

      const busyHoursByUser = new Map<string, number>();
      const oooHoursByUser = new Map<string, { hours: number; windows: Array<{ start: string; end: string }> }>();

      resolvedCalendarEvents.forEach((event) => {
        if (!isBusyEvent(event)) return;
        const duration = overlapHours(range.start, range.end, event.start_time as OptionalString, event.end_time as OptionalString);
        if (duration <= 0) return;
        const attendees: any[] = (event.attendees as any[]) ?? [];
        attendees.forEach((attendee) => {
          const userId = attendee?.user_id as OptionalString;
          if (!userId) return;
          busyHoursByUser.set(userId, (busyHoursByUser.get(userId) ?? 0) + duration);
        });
      });

      resolvedOOOEvents.forEach((event) => {
        const userId = event?.user_id as OptionalString;
        if (!userId) return;
        const duration = overlapHours(range.start, range.end, event.start_time, event.end_time);
        if (duration <= 0) return;
        const entry = oooHoursByUser.get(userId) ?? { hours: 0, windows: [] };
        entry.hours += duration;
        entry.windows.push({ start: event.start_time, end: event.end_time });
        oooHoursByUser.set(userId, entry);
      });

      const skillsByUser = new Map<string, SkillSummary[]>();
      skills?.forEach((row) => {
        const userId = row.user_id as OptionalString;
        if (!userId) return;
        const summary: SkillSummary = {
          skill: row.skill_name,
          experiencePoints: Number(row.experience_points ?? 0),
          level: row.current_level ?? null,
        };
        const list = skillsByUser.get(userId) ?? [];
        list.push(summary);
        skillsByUser.set(userId, list);
      });

      const workingDays = Math.max(1, differenceInBusinessDays(range.end, range.start) + 1);
      const baseCapacity = workingDays * BUSINESS_HOURS_PER_DAY;

      const workloadByUser = new Map<string, ResourceWorkload>();

      const ensureEntry = (userId: string) => {
        if (!workloadByUser.has(userId)) {
          const identity = memberMap.get(userId) ?? { fullName: "Unassigned", avatarUrl: null };
          const oooEntry = oooHoursByUser.get(userId) ?? { hours: 0, windows: [] };
          const busyHours = busyHoursByUser.get(userId) ?? 0;
          const availableHours = Math.max(0, baseCapacity - oooEntry.hours);
          workloadByUser.set(userId, {
            userId,
            fullName: identity.fullName,
            avatarUrl: identity.avatarUrl,
            baseCapacityHours: baseCapacity,
            availableHours,
            busyHours,
            oooHours: oooEntry.hours,
            taskHours: 0,
            taskCount: 0,
            urgentTaskCount: 0,
            completionRate: 0,
            utilization: 0,
            assignments: [],
            skills: skillsByUser.get(userId) ?? [],
            oooWindows: oooEntry.windows,
          });
        }
        return workloadByUser.get(userId)!;
      };

      tasks?.forEach((task: any) => {
        const estimatedHours = Number(task.estimated_hours ?? 0);
        const dueDate = task.due_date ?? null;
        const status = task.status ?? null;
        const priority = task.priority ?? null;
        const projectName = task.project?.name ?? null;
        const assignmentRecords: any[] = task.assignees ?? [];

        assignmentRecords.forEach((assignment) => {
          const userId = assignment?.user_id as OptionalString;
          if (!userId) return;
          const entry = ensureEntry(userId);
          const assignmentRecord: ResourceAssignment = {
            taskId: task.id,
            title: task.title ?? "Untitled task",
            estimatedHours,
            dueDate,
            priority,
            status,
            projectName,
          };
          entry.assignments.push(assignmentRecord);
          entry.taskCount += 1;
          entry.taskHours += estimatedHours;
          if (isUrgentTask(assignmentRecord, range.start)) {
            entry.urgentTaskCount += 1;
          }
        });
      });

      workloadByUser.forEach((entry) => {
        const completed = entry.assignments.filter((assignment) => {
          const status = (assignment.status ?? "").toLowerCase();
          return status === "done" || status === "completed" || status === "resolved";
        }).length;
        entry.completionRate = entry.taskCount > 0 ? Math.round((completed / entry.taskCount) * 100) : 0;
        entry.utilization = entry.availableHours > 0 ? clamp((entry.taskHours / entry.availableHours) * 100, 0, 200) : 0;
      });

      const finalData = Array.from(workloadByUser.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));

      setState({
        data: finalData,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught));
      console.error("Failed to load resource workload", error);
      setState({ data: [], loading: false, error, lastUpdated: null });
    }
  }, [projectId, range.end, range.start]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    data,
    error,
    loading,
    refresh,
    timeframe,
    range,
    lastUpdated,
  };
}

export type UseResourceWorkloadResult = ReturnType<typeof useResourceWorkload>;
