import type { BoardViewRecord } from "./context";
import type { MasterBoardViewFilters } from "@/types/boards";

export interface MasterBoardRecord extends BoardViewRecord {
  boardId: string;
  boardName: string;
  boardColor?: string;
  groupId: string;
  groupName: string;
  projectIds?: string[];
  componentIds?: string[];
  versionIds?: string[];
  metrics?: {
    total?: number;
    completed?: number;
  };
}

export interface MasterGroupSummary {
  key: string;
  boardId: string;
  boardName: string;
  label: string;
  color: string;
  total: number;
  completed: number;
  progress: number;
  items: MasterBoardRecord[];
  projectIds: string[];
  componentIds: string[];
  versionIds: string[];
}

const FALLBACK_COLOR = "#64748b";

const BOARD_COLORS = ["#2563eb", "#22c55e", "#f97316", "#d946ef", "#06b6d4", "#f43f5e"];

export const EMPTY_FILTERS: MasterBoardViewFilters = {
  projectIds: [],
  componentIds: [],
  versionIds: [],
};

const normaliseList = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => (typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String((value as { id: unknown }).id) : null))
    .filter((value): value is string => Boolean(value));
};

export const normaliseMasterFilters = (
  filters: MasterBoardViewFilters | null | undefined
): MasterBoardViewFilters => {
  if (!filters) {
    return { ...EMPTY_FILTERS };
  }
  return {
    projectIds: Array.from(new Set((filters.projectIds ?? []).filter((value) => typeof value === "string"))),
    componentIds: Array.from(new Set((filters.componentIds ?? []).filter((value) => typeof value === "string"))),
    versionIds: Array.from(new Set((filters.versionIds ?? []).filter((value) => typeof value === "string"))),
  };
};

const assignBoardColors = (records: MasterBoardRecord[]): Map<string, string> => {
  const palette = [...BOARD_COLORS];
  const colors = new Map<string, string>();

  for (const record of records) {
    const existing = colors.get(record.boardId);
    if (existing) {
      continue;
    }

    if (typeof record.boardColor === "string" && record.boardColor.trim()) {
      colors.set(record.boardId, record.boardColor);
      continue;
    }

    const next = palette.shift() ?? FALLBACK_COLOR;
    colors.set(record.boardId, next);
  }

  return colors;
};

export const filterMasterRecords = (
  records: MasterBoardRecord[],
  filters: MasterBoardViewFilters
): MasterBoardRecord[] => {
  const projectSet = new Set(filters.projectIds);
  const componentSet = new Set(filters.componentIds);
  const versionSet = new Set(filters.versionIds);

  if (!projectSet.size && !componentSet.size && !versionSet.size) {
    return [...records];
  }

  return records.filter((record) => {
    const projects = normaliseList(record.projectIds);
    const components = normaliseList(record.componentIds);
    const versions = normaliseList(record.versionIds);

    if (projectSet.size && !projects.some((id) => projectSet.has(id))) {
      return false;
    }

    if (componentSet.size && !components.some((id) => componentSet.has(id))) {
      return false;
    }

    if (versionSet.size && !versions.some((id) => versionSet.has(id))) {
      return false;
    }

    return true;
  });
};

export const aggregateMasterGroups = (
  records: MasterBoardRecord[]
): MasterGroupSummary[] => {
  if (!records.length) {
    return [];
  }

  const colorMap = assignBoardColors(records);
  const byKey = new Map<string, MasterGroupSummary>();

  for (const record of records) {
    const key = `${record.boardId}:${record.groupId}`;
    const existing = byKey.get(key);
    const total = typeof record.metrics?.total === "number" ? record.metrics?.total : 1;
    const completed = typeof record.metrics?.completed === "number" ? record.metrics.completed : 0;

    if (!existing) {
      byKey.set(key, {
        key,
        boardId: record.boardId,
        boardName: record.boardName,
        label: record.groupName,
        color: colorMap.get(record.boardId) ?? FALLBACK_COLOR,
        total,
        completed,
        progress: total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0,
        items: [record],
        projectIds: normaliseList(record.projectIds),
        componentIds: normaliseList(record.componentIds),
        versionIds: normaliseList(record.versionIds),
      });
      continue;
    }

    existing.items.push(record);
    existing.total += total;
    existing.completed += completed;
    existing.progress = existing.total > 0 ? Math.min(1, Math.max(0, existing.completed / existing.total)) : 0;
    existing.projectIds = Array.from(new Set([...existing.projectIds, ...normaliseList(record.projectIds)]));
    existing.componentIds = Array.from(new Set([...existing.componentIds, ...normaliseList(record.componentIds)]));
    existing.versionIds = Array.from(new Set([...existing.versionIds, ...normaliseList(record.versionIds)]));
  }

  return Array.from(byKey.values()).sort((a, b) => a.boardName.localeCompare(b.boardName) || a.label.localeCompare(b.label));
};

export interface MasterFilterOptions {
  projects: string[];
  components: string[];
  versions: string[];
}

export const buildMasterFilterOptions = (records: MasterBoardRecord[]): MasterFilterOptions => {
  const projects = new Set<string>();
  const components = new Set<string>();
  const versions = new Set<string>();

  records.forEach((record) => {
    normaliseList(record.projectIds).forEach((id) => projects.add(id));
    normaliseList(record.componentIds).forEach((id) => components.add(id));
    normaliseList(record.versionIds).forEach((id) => versions.add(id));
  });

  return {
    projects: Array.from(projects).sort(),
    components: Array.from(components).sort(),
    versions: Array.from(versions).sort(),
  };
};
