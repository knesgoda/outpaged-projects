import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import type { BoardViewConfiguration, BoardViewRecord } from "./context";

export type BoardMetricTone = "neutral" | "positive" | "warning" | "critical";

export interface BoardMetricDisplay {
  id: string;
  label: string;
  value: string;
  changeLabel?: string;
  tone: BoardMetricTone;
  tooltip: string;
  icon: string;
}

export interface BoardMetricsSummary {
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  blockedItems: number;
  overdueItems: number;
  storyPoints: {
    total: number;
    completed: number;
    remaining: number;
  };
  time: {
    actualHours: number;
    estimatedHours: number;
    varianceHours: number;
  };
  burndown: {
    totalPoints: number;
    completedPoints: number;
    idealRemaining: number;
    actualRemaining: number;
    totalDays: number;
    elapsedDays: number;
    onTrack: boolean;
  };
  sla: {
    totalTracked: number;
    withinSla: number;
    breached: number;
    dueSoon: number;
  };
}

const STATUS_DONE_PATTERN = /(done|complete|closed|resolved|shipped|finished)/i;
const STATUS_PROGRESS_PATTERN = /(progress|doing|active|review|qa|testing|running)/i;
const STATUS_BLOCKED_PATTERN = /(blocked|waiting|hold|paused)/i;

const HOURS_FIELDS = [
  "actual_hours",
  "actualHours",
  "time_logged",
  "timeLogged",
  "time_spent",
  "timeSpent",
  "logged_hours",
  "loggedHours",
];

const ESTIMATE_FIELDS = [
  "estimated_hours",
  "estimatedHours",
  "planned_hours",
  "plannedHours",
  "estimate_hours",
  "estimateHours",
  "time_estimate",
  "timeEstimate",
];

const POINT_FIELDS = [
  "story_points",
  "storyPoints",
  "points",
  "estimate_points",
  "estimatePoints",
];

const START_FIELDS = ["start_date", "startDate", "kickoff_at", "kickoffAt", "created_at", "createdAt"];
const END_FIELDS = ["due_date", "dueDate", "end_date", "endDate", "target_date", "targetDate", "sprint_end", "sprintEnd"];

const SLA_DUE_FIELDS = ["sla_due_at", "slaDueAt", "sla_due", "slaDue", "breach_at", "breachAt"];

const isNonEmptyArray = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normaliseDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }
  return null;
};

const getFieldValue = (item: BoardViewRecord, fields: string[]): unknown => {
  for (const field of fields) {
    if (field in item) {
      const value = item[field];
      if (value != null && value !== "") {
        return value;
      }
    }
  }
  return undefined;
};

const coerceToArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
};

const valuesMatch = (candidate: unknown, expected: unknown): boolean => {
  if (expected == null) {
    return true;
  }
  if (Array.isArray(candidate)) {
    return candidate.some((entry) => valuesMatch(entry, expected));
  }
  if (Array.isArray(expected)) {
    return expected.some((entry) => valuesMatch(candidate, entry));
  }
  if (typeof expected === "object") {
    if (expected && "value" in expected) {
      return valuesMatch(candidate, (expected as { value: unknown }).value);
    }
    if (expected && "values" in expected && Array.isArray((expected as { values: unknown }).values)) {
      return valuesMatch(candidate, (expected as { values: unknown[] }).values);
    }
    if (expected && "min" in expected && "max" in expected) {
      const numeric = toNumber(candidate);
      const min = toNumber((expected as { min: unknown }).min);
      const max = toNumber((expected as { max: unknown }).max);
      if (Number.isFinite(min) && numeric < min) return false;
      if (Number.isFinite(max) && numeric > max) return false;
      return true;
    }
    if (expected && "eq" in expected) {
      return valuesMatch(candidate, (expected as { eq: unknown }).eq);
    }
    if (expected && "ne" in expected) {
      return !valuesMatch(candidate, (expected as { ne: unknown }).ne);
    }
  }
  if (candidate == null) {
    return false;
  }
  if (typeof candidate === "string" || typeof expected === "string") {
    return String(candidate).toLowerCase() === String(expected).toLowerCase();
  }
  return candidate === expected;
};

export const applyBoardFilters = (
  items: BoardViewRecord[],
  filters: BoardViewConfiguration["filters"]
): BoardViewRecord[] => {
  const entries = Object.entries(filters ?? {});
  if (!entries.length) {
    return [...items];
  }

  return items.filter((item) =>
    entries.every(([key, criteria]) => {
      if (criteria == null || criteria === "") {
        return true;
      }
      const value = item[key];
      if (Array.isArray(criteria)) {
        return criteria.some((candidate) => valuesMatch(value, candidate));
      }
      if (typeof criteria === "object") {
        if ((criteria as { include?: unknown[] }).include) {
          const include = (criteria as { include: unknown[] }).include;
          return include.length ? include.some((candidate) => valuesMatch(value, candidate)) : true;
        }
        if ((criteria as { exclude?: unknown[] }).exclude) {
          const exclude = (criteria as { exclude: unknown[] }).exclude;
          return exclude.every((candidate) => !valuesMatch(value, candidate));
        }
      }
      return valuesMatch(value, criteria);
    })
  );
};

const detectStatus = (item: BoardViewRecord): string => {
  const raw =
    (typeof item.status === "string" && item.status) ||
    (typeof item.state === "string" && item.state) ||
    (typeof item.stage === "string" && item.stage) ||
    "";
  return raw;
};

const isCompleted = (item: BoardViewRecord, status: string): boolean => {
  if (typeof item.completed === "boolean") {
    return item.completed;
  }
  if (typeof item.isDone === "boolean") {
    return item.isDone;
  }
  return STATUS_DONE_PATTERN.test(status);
};

const isBlocked = (item: BoardViewRecord, status: string): boolean => {
  if (item.blocked === true) {
    return true;
  }
  if (typeof item.blocking_reason === "string" && item.blocking_reason.trim()) {
    return true;
  }
  return STATUS_BLOCKED_PATTERN.test(status);
};

const isInProgress = (status: string): boolean => STATUS_PROGRESS_PATTERN.test(status);

const extractStoryPoints = (item: BoardViewRecord): number => {
  const value = getFieldValue(item, POINT_FIELDS);
  return toNumber(value);
};

const extractHours = (item: BoardViewRecord, fields: string[]): number => {
  const value = getFieldValue(item, fields);
  return toNumber(value);
};

const extractDate = (item: BoardViewRecord, fields: string[]): Date | null => {
  const value = getFieldValue(item, fields);
  return normaliseDate(value);
};

const selectEarliestDate = (dates: Array<Date | null>): Date | null => {
  return dates.reduce<Date | null>((earliest, candidate) => {
    if (!candidate) return earliest;
    if (!earliest) return candidate;
    return candidate.getTime() < earliest.getTime() ? candidate : earliest;
  }, null);
};

const selectLatestDate = (dates: Array<Date | null>): Date | null => {
  return dates.reduce<Date | null>((latest, candidate) => {
    if (!candidate) return latest;
    if (!latest) return candidate;
    return candidate.getTime() > latest.getTime() ? candidate : latest;
  }, null);
};

const HOURS_DECIMALS = 1;
const POINT_DECIMALS = 1;

export const calculateBoardMetrics = (
  items: BoardViewRecord[],
  configuration: BoardViewConfiguration,
  now: Date = new Date()
): BoardMetricsSummary => {
  const filtered = applyBoardFilters(items, configuration.filters ?? {});

  let totalItems = 0;
  let completedItems = 0;
  let inProgressItems = 0;
  let blockedItems = 0;
  let overdueItems = 0;

  let totalPoints = 0;
  let completedPoints = 0;

  let actualHours = 0;
  let estimatedHours = 0;

  const potentialStartDates: Array<Date | null> = [];
  const potentialEndDates: Array<Date | null> = [];

  let slaTracked = 0;
  let slaWithin = 0;
  let slaBreached = 0;
  let slaDueSoon = 0;

  filtered.forEach((item) => {
    totalItems += 1;
    const status = detectStatus(item);
    const completed = isCompleted(item, status);
    const blocked = isBlocked(item, status);
    const inProgress = !completed && !blocked && isInProgress(status);

    if (completed) completedItems += 1;
    if (blocked) blockedItems += 1;
    if (inProgress) inProgressItems += 1;

    const dueDate = extractDate(item, END_FIELDS);
    potentialEndDates.push(dueDate);
    potentialStartDates.push(extractDate(item, START_FIELDS));

    if (dueDate && !completed && dueDate.getTime() < now.getTime()) {
      overdueItems += 1;
    }

    const points = extractStoryPoints(item);
    totalPoints += points;
    if (completed) {
      completedPoints += points;
    }

    actualHours += extractHours(item, HOURS_FIELDS);
    estimatedHours += extractHours(item, ESTIMATE_FIELDS);

    const slaDue = extractDate(item, SLA_DUE_FIELDS);
    const explicitSlaStatus =
      (typeof item.sla_status === "string" && item.sla_status) ||
      (typeof item.slaStatus === "string" && item.slaStatus) ||
      "";
    const breachedFlag = Boolean(
      item.sla_breached === true ||
        item.slaBreached === true ||
        /breach|violated/i.test(explicitSlaStatus)
    );

    if (slaDue || explicitSlaStatus || typeof item.sla_minutes_remaining === "number") {
      slaTracked += 1;
      const dueSoon = slaDue ? slaDue.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 : false;
      const breachByDate = slaDue ? slaDue.getTime() < now.getTime() : false;
      const hasBreached = breachedFlag || (breachByDate && !completed);

      if (hasBreached) {
        slaBreached += 1;
      } else {
        slaWithin += 1;
      }

      if (dueSoon && !completed && !hasBreached) {
        slaDueSoon += 1;
      }
    }
  });

  const remainingPoints = Math.max(0, totalPoints - completedPoints);
  const varianceHours = actualHours - estimatedHours;

  const start = selectEarliestDate(potentialStartDates) ?? now;
  const end = selectLatestDate(potentialEndDates) ?? now;

  let totalDays = differenceInCalendarDays(end, start);
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    totalDays = 1;
  }
  let elapsedDays = differenceInCalendarDays(now, start);
  if (!Number.isFinite(elapsedDays)) {
    elapsedDays = 0;
  }
  elapsedDays = Math.min(Math.max(elapsedDays, 0), totalDays);

  const expectedCompleted = totalPoints * (elapsedDays / totalDays);
  const idealRemaining = Math.max(0, totalPoints - expectedCompleted);
  const actualRemaining = remainingPoints;
  const onTrack = actualRemaining <= idealRemaining + 0.5; // small tolerance

  return {
    totalItems,
    completedItems,
    inProgressItems,
    blockedItems,
    overdueItems,
    storyPoints: {
      total: Number(totalPoints.toFixed(POINT_DECIMALS)),
      completed: Number(completedPoints.toFixed(POINT_DECIMALS)),
      remaining: Number(remainingPoints.toFixed(POINT_DECIMALS)),
    },
    time: {
      actualHours: Number(actualHours.toFixed(HOURS_DECIMALS)),
      estimatedHours: Number(estimatedHours.toFixed(HOURS_DECIMALS)),
      varianceHours: Number(varianceHours.toFixed(HOURS_DECIMALS)),
    },
    burndown: {
      totalPoints: Number(totalPoints.toFixed(POINT_DECIMALS)),
      completedPoints: Number(completedPoints.toFixed(POINT_DECIMALS)),
      idealRemaining: Number(idealRemaining.toFixed(POINT_DECIMALS)),
      actualRemaining: Number(actualRemaining.toFixed(POINT_DECIMALS)),
      totalDays,
      elapsedDays,
      onTrack,
    },
    sla: {
      totalTracked: slaTracked,
      withinSla: slaWithin,
      breached: slaBreached,
      dueSoon: slaDueSoon,
    },
  };
};

const pluralise = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"}`;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export const buildBoardMetricDisplays = (
  summary: BoardMetricsSummary
): BoardMetricDisplay[] => {
  const metrics: BoardMetricDisplay[] = [];

  metrics.push({
    id: "work-total",
    label: "Total work",
    value: `${summary.totalItems}`,
    changeLabel: `${summary.completedItems} done` + (summary.overdueItems ? ` · ${summary.overdueItems} overdue` : ""),
    tone: "neutral",
    tooltip: `${summary.totalItems} items in view. ${summary.completedItems} completed, ${summary.inProgressItems} in progress, ${summary.blockedItems} blocked.`,
    icon: "kanban",
  });

  metrics.push({
    id: "points-remaining",
    label: "Points remaining",
    value: `${summary.storyPoints.remaining} pts`,
    changeLabel: `${summary.storyPoints.completed} pts done`,
    tone: summary.storyPoints.remaining === 0 ? "positive" : "neutral",
    tooltip: `${summary.storyPoints.total} total story points with ${summary.storyPoints.remaining} remaining to complete.`,
    icon: "target",
  });

  const variance = summary.time.varianceHours;
  metrics.push({
    id: "time-logged",
    label: "Time logged",
    value: `${summary.time.actualHours} h`,
    changeLabel:
      summary.time.estimatedHours > 0
        ? `${summary.time.estimatedHours} h planned`
        : undefined,
    tone: variance > 1 ? "warning" : variance < -1 ? "positive" : "neutral",
    tooltip:
      summary.time.estimatedHours > 0
        ? `Logged ${summary.time.actualHours} hours versus ${summary.time.estimatedHours} planned (${variance >= 0 ? "+" : ""}${variance} h).`
        : `Logged ${summary.time.actualHours} hours on tracked work.`,
    icon: "clock",
  });

  metrics.push({
    id: "burndown",
    label: summary.burndown.onTrack ? "Burndown on track" : "Burndown off track",
    value: `${summary.burndown.actualRemaining} pts left`,
    changeLabel: `${pluralise(summary.burndown.totalDays - summary.burndown.elapsedDays, "day")} remaining`,
    tone: summary.burndown.onTrack ? "positive" : "warning",
    tooltip: summary.burndown.onTrack
      ? `Projected remaining points (${summary.burndown.actualRemaining}) are within the ideal target (${summary.burndown.idealRemaining}).`
      : `Remaining points (${summary.burndown.actualRemaining}) exceed the ideal target (${summary.burndown.idealRemaining}). Consider replanning.`,
    icon: "flame",
  });

  if (summary.sla.totalTracked > 0) {
    const compliance = summary.sla.withinSla / summary.sla.totalTracked;
    metrics.push({
      id: "sla",
      label: "SLA compliance",
      value: formatPercent(compliance),
      changeLabel:
        summary.sla.dueSoon > 0 ? `${summary.sla.dueSoon} due soon` : `${summary.sla.breached} breached`,
      tone:
        summary.sla.breached > 0
          ? "critical"
          : summary.sla.dueSoon > 0
            ? "warning"
            : "positive",
      tooltip: `${summary.sla.withinSla} of ${summary.sla.totalTracked} tracked tasks are within SLA. ${summary.sla.breached} breached, ${summary.sla.dueSoon} approaching limits.`,
      icon: "shield",
    });
  }

  return metrics;
};
