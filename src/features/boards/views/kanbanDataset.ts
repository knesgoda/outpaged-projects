import type {
  BoardColorRule,
  BoardSwimlaneDefinition,
  BoardViewGroupingConfiguration,
  BoardViewSortRule,
} from "@/types/boards"
import type { BoardGroupSummary } from "@/components/boards/types"
import type { Database } from "@/integrations/supabase/types"

import { buildColorLegend, evaluateColorRules } from "./colorRules"

export const UNGROUPED_KEY = "__ungrouped"
export const DEFAULT_SWIMLANE_ID = "__default"
export const DROPPABLE_ID_SEPARATOR = "::"

export interface KanbanCard {
  id: string
  record: Record<string, unknown>
  color?: string
  ruleId?: string | null
}

export type KanbanColumnRecord = Database["public"]["Tables"]["kanban_columns"]["Row"]

export interface KanbanColumn {
  id: string
  key: string
  label: string
  items: KanbanCard[]
  columnId: string | null
  columnRecord?: KanbanColumnRecord | null
  rollup: {
    total: number
    completed: number
  }
}

export interface KanbanSwimlane {
  id: string
  label: string
  color?: string
  description?: string
  isDefault?: boolean
  groups: KanbanColumn[]
}

export interface KanbanDataset {
  swimlanes: KanbanSwimlane[]
  groupSummaries: BoardGroupSummary[]
  legends: ReturnType<typeof buildColorLegend>
  groupingField: string | null
  swimlaneField: string | null
  totalItems: number
  definitions: BoardSwimlaneDefinition[]
}

export interface BuildKanbanDatasetParams {
  items: Record<string, unknown>[]
  grouping: BoardViewGroupingConfiguration
  sortRules: BoardViewSortRule[]
  colorRules: BoardColorRule[]
  columnLookup?: Map<string, KanbanColumnRecord>
}

const GROUP_ACCENTS = ["#2563eb", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#6366f1"]

const toItemId = (item: Record<string, unknown>, index: number) => {
  if (typeof item.id === "string" || typeof item.id === "number") {
    return String(item.id)
  }
  if (typeof item.uuid === "string") {
    return item.uuid
  }
  if (typeof item.key === "string") {
    return item.key
  }
  return `item-${index}`
}

const normalizeValue = (value: unknown) => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "number" || typeof value === "boolean") {
    return value
  }
  return String(value)
}

const valuesEqual = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeValue(left)
  const normalizedRight = normalizeValue(right)
  return normalizedLeft === normalizedRight
}

export const composeDroppableId = (swimlaneId: string, groupKey: string) =>
  `${swimlaneId}${DROPPABLE_ID_SEPARATOR}${groupKey}`

export const parseDroppableId = (droppableId: string) => {
  const [swimlaneId, groupKey] = droppableId.split(DROPPABLE_ID_SEPARATOR)
  return {
    swimlaneId: swimlaneId ?? DEFAULT_SWIMLANE_ID,
    groupKey: groupKey ?? UNGROUPED_KEY,
  }
}

export const sortBoardItems = (
  items: Record<string, unknown>[],
  rules: BoardViewSortRule[]
): Record<string, unknown>[] => {
  if (!rules.length) {
    return [...items]
  }

  if (rules.some((rule) => rule.manual)) {
    return [...items]
  }

  const comparator = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    for (const rule of rules) {
      const field = rule.field
      const direction = rule.direction === "desc" ? -1 : 1
      const aValue = a[field]
      const bValue = b[field]

      if (aValue == null && bValue == null) {
        continue
      }
      if (aValue == null) {
        return 1 * direction
      }
      if (bValue == null) {
        return -1 * direction
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        if (aValue !== bValue) {
          return aValue > bValue ? direction : -direction
        }
        continue
      }

      const aText = normalizeValue(aValue)
      const bText = normalizeValue(bValue)

      if (aText === bText) {
        continue
      }

      return aText > bText ? direction : -direction
    }

    return 0
  }

  return [...items].sort(comparator)
}

const ensureSwimlaneDefaults = (
  swimlanes: BoardSwimlaneDefinition[],
  swimlaneField: string | null
): BoardSwimlaneDefinition[] => {
  if (!swimlanes.length) {
    return [
      {
        id: DEFAULT_SWIMLANE_ID,
        label: "All items",
        value: null,
        isDefault: true,
        order: 0,
        field: swimlaneField ?? undefined,
        valueKey: "__default__",
      },
    ]
  }

  const sorted = [...swimlanes]
    .map((lane, index) => ({
      ...lane,
      order: typeof lane.order === "number" ? lane.order : index,
      field: lane.field ?? swimlaneField ?? undefined,
      valueKey:
        typeof lane.valueKey === "string"
          ? lane.valueKey
          : lane.value == null
            ? "__default__"
            : String(normalizeValue(lane.value)),
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  if (!sorted.some((lane) => lane.isDefault)) {
    sorted.push({
      id: DEFAULT_SWIMLANE_ID,
      label: "Unassigned",
      value: null,
      isDefault: true,
      order: sorted.length,
      field: swimlaneField ?? undefined,
      valueKey: "__default__",
    })
  }

  return sorted
}

const resolveSwimlaneId = (
  item: Record<string, unknown>,
  swimlanes: BoardSwimlaneDefinition[],
  swimlaneField: string | null
) => {
  if (!swimlaneField) {
    const fallback = swimlanes.find((lane) => lane.isDefault) ?? swimlanes[0]
    return fallback?.id ?? DEFAULT_SWIMLANE_ID
  }

  const defaultLane = swimlanes.find((lane) => lane.isDefault)

  for (const lane of swimlanes) {
    if (lane.isDefault) {
      continue
    }
    const field = lane.field ?? swimlaneField
    if (!field) {
      continue
    }
    if (valuesEqual(item[field], lane.value)) {
      return lane.id
    }
  }

  return defaultLane?.id ?? swimlanes[0]?.id ?? DEFAULT_SWIMLANE_ID
}

const getGroupKey = (groupingField: string | null, item: Record<string, unknown>) => {
  if (!groupingField) {
    return UNGROUPED_KEY
  }
  const value = item[groupingField]
  if (value == null || value === "") {
    return UNGROUPED_KEY
  }
  return String(value)
}

const getGroupLabel = (groupKey: string) =>
  groupKey === UNGROUPED_KEY ? "No value" : groupKey

const computeRollup = (items: KanbanCard[]) => {
  const total = items.length
  const completed = items.filter((card) => {
    const status = typeof card.record.status === "string" ? card.record.status : undefined
    const state = typeof card.record.state === "string" ? card.record.state : undefined
    const normalized = (status ?? state ?? "").toLowerCase()
    if (card.record.completed === true) return true
    if (!normalized) return false
    return normalized.includes("done") || normalized.includes("complete")
  }).length

  return { total, completed }
}

export const buildKanbanDataset = ({
  items,
  grouping,
  sortRules,
  colorRules,
  columnLookup,
}: BuildKanbanDatasetParams): KanbanDataset => {
  const sortedItems = sortBoardItems(items, sortRules)
  const groupingField = grouping.primary ?? null
  const swimlaneField = grouping.swimlaneField ?? null
  const swimlaneDefinitions = ensureSwimlaneDefaults(
    grouping.swimlanes ?? [],
    swimlaneField
  )

  const resolvedLookup = columnLookup ?? new Map<string, KanbanColumnRecord>()

  const laneMap = new Map<string, BoardSwimlaneDefinition>()
  swimlaneDefinitions.forEach((lane) => laneMap.set(lane.id, lane))

  type LaneGroupEntry = {
    label: string
    items: KanbanCard[]
    columnRecord?: KanbanColumnRecord | null
  }

  const laneGroupMap = new Map<
    string,
    Map<
      string,
      LaneGroupEntry
    >
  >()
  const groupOrder: string[] = []

  sortedItems.forEach((item, index) => {
    const itemId = toItemId(item, index)
    const laneId = resolveSwimlaneId(item, swimlaneDefinitions, swimlaneField)
    const groupKey = getGroupKey(groupingField, item)
    if (!groupOrder.includes(groupKey)) {
      groupOrder.push(groupKey)
    }

    if (!laneGroupMap.has(laneId)) {
      laneGroupMap.set(laneId, new Map())
    }

    const groups = laneGroupMap.get(laneId)!
    if (!groups.has(groupKey)) {
      const columnRecord = resolvedLookup.get(groupKey) ?? null
      groups.set(groupKey, {
        label: columnRecord?.name ?? getGroupLabel(groupKey),
        items: [],
        columnRecord,
      })
    }

    const colorMatch = evaluateColorRules(item, colorRules)
    groups.get(groupKey)!.items.push({
      id: itemId,
      record: item,
      color: colorMatch.color,
      ruleId: colorMatch.rule?.id ?? null,
    })
  })

  if (groupOrder.length === 0) {
    groupOrder.push(UNGROUPED_KEY)
  }

  const swimlanes: KanbanSwimlane[] = swimlaneDefinitions.map((lane) => {
    const groups = laneGroupMap.get(lane.id) ?? new Map()
    const columns: KanbanColumn[] = groupOrder.map((groupKey, index) => {
      const column =
        groups.get(groupKey) ??
        ({
          label: resolvedLookup.get(groupKey)?.name ?? getGroupLabel(groupKey),
          items: [],
          columnRecord: resolvedLookup.get(groupKey) ?? null,
        } as LaneGroupEntry)
      const record = column.columnRecord ?? resolvedLookup.get(groupKey) ?? null
      return {
        id: composeDroppableId(lane.id, groupKey),
        key: groupKey,
        label: record?.name ?? column.label,
        items: column.items,
        columnId: record?.id ?? null,
        columnRecord: record,
        rollup: computeRollup(column.items),
      }
    })

    return {
      id: lane.id,
      label: lane.label,
      color: lane.color,
      description: lane.description,
      isDefault: lane.isDefault,
      groups: columns,
    }
  })

  const summaries = groupOrder.map((groupKey, index) => {
    let count = 0
    swimlanes.forEach((lane) => {
      const column = lane.groups[index]
      if (column) {
        count += column.items.length
      }
    })

    const record = resolvedLookup.get(groupKey) ?? null
    return {
      id: groupKey,
      name: record?.name ?? getGroupLabel(groupKey),
      count,
      accentColor: GROUP_ACCENTS[index % GROUP_ACCENTS.length],
    }
  })

  const legends = buildColorLegend(colorRules)

  return {
    swimlanes,
    groupSummaries: summaries,
    legends,
    groupingField,
    swimlaneField,
    totalItems: items.length,
    definitions: swimlaneDefinitions,
  }
}

export const deriveSwimlaneDefinitions = (
  items: Record<string, unknown>[],
  field: string
): BoardSwimlaneDefinition[] => {
  const buckets = new Map<string, { value: unknown; count: number }>()

  items.forEach((item) => {
    const rawValue = item[field]
    const key = rawValue == null ? "__default__" : String(normalizeValue(rawValue))
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count += 1
    } else {
      buckets.set(key, { value: rawValue ?? null, count: 1 })
    }
  })

  const ordered = Array.from(buckets.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, bucket], index) => ({
      id: `${field}-${key}-${index}`,
      label: key === "__default__" ? "Unassigned" : key,
      value: bucket.value,
      order: index,
      isDefault: key === "__default__",
      field,
      valueKey: key,
    }))

  if (!ordered.some((lane) => lane.isDefault)) {
    ordered.push({
      id: `${field}-default`,
      label: "Unassigned",
      value: null,
      order: ordered.length,
      isDefault: true,
      field,
      valueKey: "__default__",
    })
  }

  return ordered
}
