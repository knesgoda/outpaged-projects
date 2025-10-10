import { differenceInMinutes, isAfter, isBefore, parseISO } from "date-fns";

import type {
  TimelineDerivedData,
  TimelineGroup,
  TimelineItem,
  TimelineOverlay,
  TimelineOverlaySummary,
  TimelineRollup,
  TimelineSchedule,
  TimelineSnapshot,
} from "./types";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ensureDuration(start: Date | null, end: Date | null, fallbackMinutes = 0): number {
  if (!start || !end) return fallbackMinutes;
  const diff = differenceInMinutes(end, start);
  return Number.isNaN(diff) ? fallbackMinutes : Math.max(diff, 0);
}

function computeItemDuration(item: TimelineItem): number {
  const start = parseDate(item.start);
  const end = parseDate(item.end);
  if (start && end) {
    return ensureDuration(start, end, item.durationMinutes ?? 0);
  }
  return item.durationMinutes ?? 0;
}

function collectGroupChildren(groups: TimelineGroup[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const group of groups) {
    const key = group.parentId ?? "__root__";
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(group.id);
  }
  return map;
}

function collectItemsByGroup(items: TimelineItem[]): Record<string, TimelineItem[]> {
  const map: Record<string, TimelineItem[]> = {};
  for (const item of items) {
    const key = item.groupId ?? "__root__";
    if (!map[key]) {
      map[key] = [];
    }
    map[key].push(item);
  }
  return map;
}

function buildRollup(
  targetId: string,
  items: TimelineItem[],
  childGroups: string[],
  rollups: Record<string, TimelineRollup>
): TimelineRollup {
  const startDates: Date[] = [];
  const endDates: Date[] = [];
  let durationMinutes = 0;
  let weightedProgressTotal = 0;
  let weightedProgressWeight = 0;
  const childItemIds = new Set<string>();

  for (const item of items) {
    const start = parseDate(item.start);
    const end = parseDate(item.end);
    if (start) startDates.push(start);
    if (end) endDates.push(end);
    const duration = computeItemDuration(item);
    durationMinutes += duration;
    if (item.percentComplete != null) {
      weightedProgressTotal += duration * item.percentComplete;
      weightedProgressWeight += duration;
    }
    childItemIds.add(item.id);
  }

  for (const groupId of childGroups) {
    const childRollup = rollups[groupId];
    if (!childRollup) continue;
    if (childRollup.start) {
      const start = parseDate(childRollup.start);
      if (start) startDates.push(start);
    }
    if (childRollup.end) {
      const end = parseDate(childRollup.end);
      if (end) endDates.push(end);
    }
    durationMinutes += childRollup.durationMinutes;
    if (childRollup.percentComplete != null) {
      weightedProgressTotal += childRollup.percentComplete * childRollup.durationMinutes;
      weightedProgressWeight += childRollup.durationMinutes;
    }
    for (const id of childRollup.childItemIds) {
      childItemIds.add(id);
    }
  }

  const startValue = startDates.length ? new Date(Math.min(...startDates.map(date => date.getTime()))) : null;
  const endValue = endDates.length ? new Date(Math.max(...endDates.map(date => date.getTime()))) : null;
  const percentComplete =
    weightedProgressWeight > 0 ? weightedProgressTotal / weightedProgressWeight : null;

  return {
    targetId,
    start: startValue ? startValue.toISOString() : null,
    end: endValue ? endValue.toISOString() : null,
    durationMinutes,
    percentComplete,
    childItemIds: Array.from(childItemIds),
  };
}

function buildRollups(snapshot: TimelineSnapshot): Record<string, TimelineRollup> {
  const groupChildren = collectGroupChildren(snapshot.groups);
  const itemsByGroup = collectItemsByGroup(snapshot.items);
  const order = [...snapshot.groups].sort((a, b) => (a.parentId ?? "").localeCompare(b.parentId ?? ""));
  const rollups: Record<string, TimelineRollup> = {};

  for (let i = order.length - 1; i >= 0; i -= 1) {
    const group = order[i];
    const itemChildren = itemsByGroup[group.id] ?? [];
    const childGroups = groupChildren[group.id] ?? [];
    rollups[group.id] = buildRollup(group.id, itemChildren, childGroups, rollups);
  }

  const rootItems = itemsByGroup.__root__ ?? [];
  const rootGroups = groupChildren.__root__ ?? [];
  rollups.__root__ = buildRollup("__root__", rootItems, rootGroups, rollups);

  return rollups;
}

function buildSchedules(snapshot: TimelineSnapshot): Record<string, TimelineSchedule> {
  const baselineByItem = new Map(snapshot.baselines.map(baseline => [baseline.itemId, baseline]));
  const schedules: Record<string, TimelineSchedule> = {};

  for (const item of snapshot.items) {
    const baseline = baselineByItem.get(item.id);
    const durationMinutes = item.durationMinutes ?? computeItemDuration(item);
    const varianceMinutes = baseline
      ? (item.durationMinutes ?? computeItemDuration(item)) - (baseline.durationMinutes ?? 0)
      : undefined;

    schedules[item.id] = {
      itemId: item.id,
      start: item.start,
      end: item.end,
      durationMinutes,
      baselineStart: baseline?.start ?? null,
      baselineEnd: baseline?.end ?? null,
      varianceMinutes: varianceMinutes ?? null,
    };
  }

  return schedules;
}

function buildWorkload(snapshot: TimelineSnapshot): Record<string, { allocationMinutes: number; itemIds: string[] }> {
  const allocations: Record<string, { allocationMinutes: number; itemIds: string[] }> = {};
  for (const metric of snapshot.workload) {
    const key = metric.personId ?? metric.teamId ?? "unassigned";
    if (!allocations[key]) {
      allocations[key] = { allocationMinutes: 0, itemIds: [] };
    }
    allocations[key].allocationMinutes += metric.allocationMinutes;
    allocations[key].itemIds.push(metric.itemId);
  }
  return allocations;
}

function buildOverlaySummaries(overlays: TimelineOverlay[]): Record<string, TimelineOverlaySummary> {
  const summaries: Record<string, TimelineOverlaySummary> = {};
  for (const overlay of overlays) {
    if (!overlay.data || overlay.data.length === 0) continue;
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    let total = 0;
    for (const datum of overlay.data) {
      minValue = Math.min(minValue, datum.value);
      maxValue = Math.max(maxValue, datum.value);
      total += datum.value;
    }
    summaries[overlay.id] = {
      overlayId: overlay.id,
      minValue,
      maxValue,
      averageValue: overlay.data.length ? total / overlay.data.length : 0,
    };
  }
  return summaries;
}

function buildRows(snapshot: TimelineSnapshot, rollups: Record<string, TimelineRollup>) {
  const rows = [] as TimelineDerivedData["rows"];
  const groupChildren = collectGroupChildren(snapshot.groups);
  const itemsByGroup = collectItemsByGroup(snapshot.items);
  const milestonesById = new Map(snapshot.milestones.map(milestone => [milestone.id, milestone]));

  const visitGroup = (groupId: string | null, depth: number) => {
    const childGroups = groupChildren[groupId ?? "__root__"] ?? [];
    const items = itemsByGroup[groupId ?? "__root__"] ?? [];

    childGroups.sort((a, b) => (snapshot.groups.find(g => g.id === a)?.orderIndex ?? 0) - (snapshot.groups.find(g => g.id === b)?.orderIndex ?? 0));
    items.sort((a, b) => (parseDate(a.start)?.getTime() ?? 0) - (parseDate(b.start)?.getTime() ?? 0));

    for (const childGroupId of childGroups) {
      const group = snapshot.groups.find(entry => entry.id === childGroupId);
      if (!group) continue;
      const rollup = rollups[group.id];
      rows.push({
        id: group.id,
        type: "group",
        depth,
        label: group.name,
        groupId: group.id,
        percentComplete: rollup?.percentComplete ?? null,
        start: rollup?.start ?? null,
        end: rollup?.end ?? null,
        isCollapsed: group.collapsed ?? false,
        hasChildren: (groupChildren[group.id] ?? []).length > 0 || (itemsByGroup[group.id] ?? []).length > 0,
        badges: group.color ? [group.color] : undefined,
      });
      visitGroup(childGroupId, depth + 1);
    }

    for (const item of items) {
      rows.push({
        id: item.id,
        type: item.kind === "milestone" ? "milestone" : "item",
        depth,
        label: item.name,
        itemId: item.id,
        percentComplete: item.percentComplete ?? null,
        start: item.start,
        end: item.end,
        badges: item.tags,
      });

      if (item.kind === "milestone" && item.baselineId) {
        const milestone = milestonesById.get(item.baselineId);
        if (milestone) {
          rows.push({
            id: `${item.id}:${milestone.id}`,
            type: "milestone",
            depth: depth + 1,
            label: milestone.name,
            milestoneId: milestone.id,
            start: milestone.date,
            end: milestone.date,
          });
        }
      }
    }
  };

  visitGroup(null, 0);
  return rows;
}

function buildDateRange(snapshot: TimelineSnapshot): { start: string | null; end: string | null } {
  let start: Date | null = null;
  let end: Date | null = null;
  for (const item of snapshot.items) {
    const itemStart = parseDate(item.start);
    const itemEnd = parseDate(item.end);
    if (itemStart) {
      start = !start || isBefore(itemStart, start) ? itemStart : start;
    }
    if (itemEnd) {
      end = !end || isAfter(itemEnd, end) ? itemEnd : end;
    }
  }
  for (const milestone of snapshot.milestones) {
    const milestoneDate = parseDate(milestone.date);
    if (milestoneDate) {
      start = !start || isBefore(milestoneDate, start) ? milestoneDate : start;
      end = !end || isAfter(milestoneDate, end) ? milestoneDate : end;
    }
  }

  return {
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
  };
}

function buildCriticalPath(snapshot: TimelineSnapshot): string[] {
  const adjacency = new Map<string, { to: string; leadLagMinutes: number }[]>();
  const indegree = new Map<string, number>();
  const items = snapshot.items;
  const itemsById = new Map(items.map(item => [item.id, item]));

  for (const item of items) {
    adjacency.set(item.id, []);
    indegree.set(item.id, 0);
  }

  for (const dependency of snapshot.dependencies) {
    if (!adjacency.has(dependency.fromId) || !adjacency.has(dependency.toId)) continue;
    adjacency.get(dependency.fromId)!.push({ to: dependency.toId, leadLagMinutes: dependency.leadLagMinutes ?? 0 });
    indegree.set(dependency.toId, (indegree.get(dependency.toId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [itemId, degree] of indegree) {
    if (degree === 0) queue.push(itemId);
  }

  const longestDuration = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  for (const item of items) {
    longestDuration.set(item.id, computeItemDuration(item));
    predecessor.set(item.id, null);
  }

  let processed = 0;
  while (queue.length) {
    const current = queue.shift()!;
    processed += 1;
    const currentDuration = longestDuration.get(current) ?? 0;
    for (const edge of adjacency.get(current) ?? []) {
      const successor = itemsById.get(edge.to);
      const successorDuration = successor ? computeItemDuration(successor) : 0;
      const tentative = currentDuration + (edge.leadLagMinutes ?? 0) + successorDuration;
      if (tentative > (longestDuration.get(edge.to) ?? successorDuration)) {
        longestDuration.set(edge.to, tentative);
        predecessor.set(edge.to, current);
      }
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) - 1);
      if ((indegree.get(edge.to) ?? 0) === 0) {
        queue.push(edge.to);
      }
    }
  }

  if (processed !== items.length) {
    const fallback = items.reduce((max, item) => {
      const duration = computeItemDuration(item);
      return duration > max.duration ? { id: item.id, duration } : max;
    }, { id: items[0]?.id ?? "", duration: 0 });
    return fallback.id ? [fallback.id] : [];
  }

  let endNode: string | null = null;
  let bestDuration = -Infinity;
  for (const [itemId, duration] of longestDuration) {
    if (duration > bestDuration) {
      bestDuration = duration;
      endNode = itemId;
    }
  }

  if (!endNode) return [];
  const path: string[] = [];
  let current: string | null = endNode;
  while (current) {
    path.unshift(current);
    current = predecessor.get(current) ?? null;
  }
  return path;
}

export function buildTimelineDerivedData(snapshot: TimelineSnapshot): TimelineDerivedData {
  const rollups = buildRollups(snapshot);
  const schedules = buildSchedules(snapshot);
  const workloadByResource = buildWorkload(snapshot);
  const overlays = buildOverlaySummaries(snapshot.overlays);
  const rows = buildRows(snapshot, rollups);
  const criticalPath = buildCriticalPath(snapshot);
  const dateRange = buildDateRange(snapshot);

  return {
    rollups,
    schedules,
    workloadByResource,
    overlays,
    rows,
    criticalPath,
    dateRange,
  };
}
