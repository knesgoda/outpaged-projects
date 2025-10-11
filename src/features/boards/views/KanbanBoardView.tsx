import { useMemo, useCallback, useState, useEffect } from "react"
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd"
import { ArrowDown, ArrowUp, Hand, PlusCircle, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { LeftSidebar } from "@/components/boards/LeftSidebar"
import type { BoardSwimlaneDefinition, BoardViewSortRule } from "@/types/boards"

import { useBoardViewContext } from "./context"
import { BoardMetricsHeader } from "./BoardMetricsHeader"
import {
  buildKanbanDataset,
  deriveSwimlaneDefinitions,
  parseDroppableId,
  UNGROUPED_KEY,
} from "./kanbanDataset"

const DEFAULT_GROUPING_FIELDS = ["status", "stage", "state"]
const NO_SWIMLANE_KEY = "__no_swimlane__"
const MANUAL_SORT_OPTION = "__manual__"

const getTitle = (item: Record<string, unknown>) => {
  if (typeof item.title === "string") {
    return item.title
  }
  if (typeof item.name === "string") {
    return item.name
  }
  if (typeof item.id === "string" || typeof item.id === "number") {
    return String(item.id)
  }
  return "Untitled"
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

const itemBelongsToLane = (
  item: Record<string, unknown>,
  laneId: string,
  definitions: BoardSwimlaneDefinition[],
  swimlaneField: string | null
) => {
  const lane = definitions.find((definition) => definition.id === laneId)
  if (!lane) {
    return false
  }

  if (!swimlaneField) {
    const fallback = definitions.find((definition) => definition.isDefault) ?? definitions[0]
    return lane.id === (fallback?.id ?? laneId)
  }

  if (lane.isDefault) {
    for (const candidate of definitions) {
      if (candidate.id === lane.id) continue
      if (candidate.isDefault) continue
      const field = candidate.field ?? swimlaneField
      if (!field) continue
      if (valuesEqual(item[field], candidate.value)) {
        return false
      }
    }
    return true
  }

  const field = lane.field ?? swimlaneField
  if (!field) {
    return false
  }

  return valuesEqual(item[field], lane.value)
}

const findPositionInLaneGroup = (
  items: Record<string, unknown>[],
  groupingField: string | null,
  swimlaneField: string | null,
  definitions: BoardSwimlaneDefinition[],
  laneId: string,
  groupKey: string,
  index: number
) => {
  let count = 0

  for (let position = 0; position < items.length; position += 1) {
    const current = items[position]
    if (!itemBelongsToLane(current, laneId, definitions, swimlaneField)) {
      continue
    }

    const currentKey = groupingField
      ? (() => {
          const value = current[groupingField]
          if (value == null || value === "") {
            return UNGROUPED_KEY
          }
          return String(value)
        })()
      : UNGROUPED_KEY

    if (currentKey === groupKey) {
      if (count === index) {
        return position
      }
      count += 1
    }
  }

  return -1
}

export interface KanbanMoveParams {
  items: Record<string, unknown>[]
  groupingField: string | null
  swimlaneField: string | null
  swimlanes: BoardSwimlaneDefinition[]
  source: { droppableId: string; index: number }
  destination: { droppableId: string; index: number }
}

export const moveKanbanCard = ({
  items,
  groupingField,
  swimlaneField,
  swimlanes,
  source,
  destination,
}: KanbanMoveParams): Record<string, unknown>[] => {
  const sourceInfo = parseDroppableId(source.droppableId)
  const destinationInfo = parseDroppableId(destination.droppableId)

  if (sourceInfo.swimlaneId !== destinationInfo.swimlaneId) {
    return items
  }

  const itemIndex = findPositionInLaneGroup(
    items,
    groupingField,
    swimlaneField,
    swimlanes,
    sourceInfo.swimlaneId,
    sourceInfo.groupKey,
    source.index
  )

  if (itemIndex === -1) {
    return items
  }

  const nextItems = [...items]
  const [moved] = nextItems.splice(itemIndex, 1)
  if (!moved) {
    return items
  }

  const destinationIndex = (() => {
    const indexInGroup = findPositionInLaneGroup(
      nextItems,
      groupingField,
      swimlaneField,
      swimlanes,
      destinationInfo.swimlaneId,
      destinationInfo.groupKey,
      destination.index
    )
    return indexInGroup === -1 ? nextItems.length : indexInGroup
  })()

  const updatedItem =
    groupingField != null
      ? {
          ...moved,
          [groupingField]: destinationInfo.groupKey === UNGROUPED_KEY ? null : destinationInfo.groupKey,
        }
      : moved

  nextItems.splice(destinationIndex, 0, updatedItem)
  return nextItems
}

export function KanbanBoardView() {
  const { items, configuration, replaceItems, updateConfiguration, isLoading } =
    useBoardViewContext()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const effectiveGrouping = useMemo(() => {
    if (configuration.grouping.primary) {
      return configuration.grouping
    }

    const fallback = DEFAULT_GROUPING_FIELDS.find((field) =>
      items.some((item) => item[field] != null)
    )

    if (!fallback) {
      return configuration.grouping
    }

    return { ...configuration.grouping, primary: fallback }
  }, [configuration.grouping, items])

  useEffect(() => {
    if (!configuration.grouping.primary && effectiveGrouping.primary) {
      updateConfiguration({
        grouping: { ...configuration.grouping, primary: effectiveGrouping.primary },
      })
    }
  }, [configuration.grouping, effectiveGrouping.primary, updateConfiguration])

  const dataset = useMemo(
    () =>
      buildKanbanDataset({
        items,
        grouping: effectiveGrouping,
        sortRules: configuration.sort ?? [],
        colorRules: configuration.colorRules ?? [],
      }),
    [configuration.colorRules, configuration.sort, effectiveGrouping, items]
  )

  const groupingField = dataset.groupingField
  const swimlaneField = effectiveGrouping.swimlaneField ?? null

  const availableFields = useMemo(() => {
    const fieldSet = new Set<string>()
    items.forEach((item) => {
      Object.keys(item).forEach((key) => fieldSet.add(key))
    })
    DEFAULT_GROUPING_FIELDS.forEach((field) => fieldSet.add(field))
    return Array.from(fieldSet)
  }, [items])

  const availableSortFields = useMemo(
    () =>
      availableFields.filter(
        (field) => !(configuration.sort ?? []).some((rule) => rule.field === field)
      ),
    [availableFields, configuration.sort]
  )

  const updateSortRules = useCallback(
    (next: BoardViewSortRule[]) => {
      updateConfiguration({
        sort: next.map((rule, index) => ({ ...rule, priority: index })),
      })
    },
    [updateConfiguration]
  )

  const handleGroupingChange = useCallback(
    (nextField: string) => {
      const primary = nextField === UNGROUPED_KEY ? null : nextField
      updateConfiguration({ grouping: { ...configuration.grouping, primary } })
    },
    [configuration.grouping, updateConfiguration]
  )

  const handleSwimlaneFieldChange = useCallback(
    (value: string) => {
      if (value === NO_SWIMLANE_KEY) {
        updateConfiguration({
          grouping: { ...configuration.grouping, swimlaneField: null, swimlanes: [] },
        })
        return
      }

      if (configuration.grouping.swimlaneField === value && configuration.grouping.swimlanes.length) {
        updateConfiguration({
          grouping: {
            ...configuration.grouping,
            swimlaneField: value,
          },
        })
        return
      }

      const definitions = deriveSwimlaneDefinitions(items, value)
      updateConfiguration({
        grouping: {
          ...configuration.grouping,
          swimlaneField: value,
          swimlanes: definitions,
        },
      })
    },
    [configuration.grouping, items, updateConfiguration]
  )

  const handleAddSortRule = useCallback(
    (field: string) => {
      if (!field) {
        return
      }

      if (field === MANUAL_SORT_OPTION) {
        const manualRule: BoardViewSortRule = {
          id: `manual-${Date.now()}`,
          field: "backlog_rank",
          direction: "asc",
          priority: 0,
          manual: true,
          label: "Manual (backlog rank)",
        }
        updateSortRules([manualRule])
        return
      }

      if ((configuration.sort ?? []).some((rule) => rule.field === field)) {
        return
      }

      const nextRule: BoardViewSortRule = {
        id: `${field}-${Date.now()}`,
        field,
        direction: "asc",
        priority: (configuration.sort ?? []).length,
      }

      updateSortRules([...(configuration.sort ?? []), nextRule])
    },
    [configuration.sort, updateSortRules]
  )

  const handleToggleSortDirection = useCallback(
    (ruleId: string) => {
      updateSortRules(
        (configuration.sort ?? []).map((rule) =>
          rule.id === ruleId
            ? { ...rule, direction: rule.direction === "asc" ? "desc" : "asc" }
            : rule
        )
      )
    },
    [configuration.sort, updateSortRules]
  )

  const handleToggleManualRule = useCallback(
    (ruleId: string) => {
      updateSortRules(
        (configuration.sort ?? []).map((rule) =>
          rule.id === ruleId ? { ...rule, manual: !rule.manual } : rule
        )
      )
    },
    [configuration.sort, updateSortRules]
  )

  const handleRemoveSortRule = useCallback(
    (ruleId: string) => {
      updateSortRules((configuration.sort ?? []).filter((rule) => rule.id !== ruleId))
    },
    [configuration.sort, updateSortRules]
  )

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source } = result
      if (!destination) {
        return
      }

      const updated = moveKanbanCard({
        items,
        groupingField: dataset.groupingField,
        swimlaneField: dataset.swimlaneField,
        swimlanes: dataset.definitions,
        source,
        destination,
      })

      if (updated !== items) {
        replaceItems(updated)
      }
    },
    [dataset.definitions, dataset.groupingField, dataset.swimlaneField, items, replaceItems]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading view…
      </div>
    )
  }

  const sortRules = configuration.sort ?? []
  const canAddManualSort = !sortRules.some((rule) => rule.manual)
  const hasMultipleSwimlanes = dataset.swimlanes.length > 1

  return (
    <div className="flex h-full gap-4">
      <LeftSidebar
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((value) => !value)}
        groups={dataset.groupSummaries}
        legends={dataset.legends}
      />

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-background px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Group by</Label>
              <Select value={groupingField ?? UNGROUPED_KEY} onValueChange={handleGroupingChange}>
                <SelectTrigger className="h-8 w-48">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNGROUPED_KEY}>Ungrouped</SelectItem>
                  {availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Swimlanes</Label>
              <Select
                value={swimlaneField ?? NO_SWIMLANE_KEY}
                onValueChange={handleSwimlaneFieldChange}
              >
                <SelectTrigger className="h-8 w-48">
                  <SelectValue placeholder="Choose field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SWIMLANE_KEY}>None</SelectItem>
                  {availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {sortRules.map((rule) => (
                <Badge key={rule.id} variant="outline" className="flex items-center gap-1">
                  <span className="capitalize">{rule.label ?? rule.field}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Toggle ${rule.field} sort direction`}
                    onClick={() => handleToggleSortDirection(rule.id)}
                  >
                    {rule.direction === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={rule.manual ? "secondary" : "ghost"}
                    aria-pressed={rule.manual}
                    aria-label={`Toggle manual ordering for ${rule.field}`}
                    onClick={() => handleToggleManualRule(rule.id)}
                  >
                    <Hand className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove sort on ${rule.field}`}
                    onClick={() => handleRemoveSortRule(rule.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Select onValueChange={handleAddSortRule}>
                <SelectTrigger className="h-8 w-48">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PlusCircle className="h-4 w-4" />
                    <SelectValue placeholder="Add sort" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableSortFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                  {canAddManualSort ? (
                    <SelectItem value={MANUAL_SORT_OPTION}>Manual backlog rank</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">{dataset.totalItems} items</Badge>
          </div>
        </div>

        <BoardMetricsHeader items={items} configuration={configuration} />

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-1 flex-col gap-6 overflow-auto px-4 pb-6">
            {dataset.swimlanes.map((lane) => {
              const laneCount = lane.groups.reduce((total, column) => total + column.items.length, 0)
              return (
                <section key={lane.id} className="space-y-3">
                  {hasMultipleSwimlanes ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: lane.color ?? "var(--muted)" }}
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold">{lane.label}</h3>
                      <Badge variant="outline">{laneCount}</Badge>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {lane.groups.map((column) => (
                      <Droppable key={column.id} droppableId={column.id}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex h-full flex-col border transition",
                              snapshot.isDraggingOver ? "border-primary" : "border-border"
                            )}
                          >
                            <CardHeader className="flex items-center justify-between gap-2 border-b bg-muted/40 py-3">
                              <CardTitle className="text-sm font-semibold">
                                {column.label}
                              </CardTitle>
                              <Badge variant="secondary">
                                {column.rollup.completed}/{column.rollup.total}
                              </Badge>
                            </CardHeader>
                            <CardContent className="space-y-3 py-3">
                              {column.items.map((card, index) => (
                                <Draggable key={card.id} draggableId={`card-${card.id}`} index={index}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                    >
                                      <button
                                        type="button"
                                        className={cn(
                                          "w-full rounded-xl border bg-card text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40",
                                          dragSnapshot.isDragging
                                            ? "border-primary"
                                            : "border-border"
                                        )}
                                        data-testid="board-card"
                                        data-color={card.color ?? undefined}
                                        style={
                                          card.color
                                            ? {
                                                borderTopColor: card.color,
                                                borderTopWidth: 4,
                                                borderTopStyle: "solid",
                                              }
                                            : undefined
                                        }
                                      >
                                        <div className="flex flex-col gap-3 p-4">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                              <p className="text-sm font-semibold text-foreground">
                                                {getTitle(card.record)}
                                              </p>
                                              {card.record.description ? (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                  {String(card.record.description)}
                                                </p>
                                              ) : null}
                                            </div>
                                            {card.record.status ? (
                                              <Badge variant="outline" className="shrink-0 text-xs capitalize">
                                                {String(card.record.status)}
                                              </Badge>
                                            ) : null}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            {card.record.assignee ? (
                                              <span>👤 {String(card.record.assignee)}</span>
                                            ) : (
                                              <span>Unassigned</span>
                                            )}
                                            {card.record.estimate ? (
                                              <span>• Est. {String(card.record.estimate)}</span>
                                            ) : null}
                                            {card.record.updatedAt ? (
                                              <span>• Updated {String(card.record.updatedAt)}</span>
                                            ) : null}
                                          </div>
                                          {Array.isArray(card.record.tags) && card.record.tags.length ? (
                                            <div className="flex flex-wrap gap-2">
                                              {card.record.tags.map((tag) => (
                                                <Badge key={String(tag)} variant="secondary" className="text-[10px]">
                                                  {String(tag)}
                                                </Badge>
                                              ))}
                                            </div>
                                          ) : null}
                                        </div>
                                      </button>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                              {!column.items.length ? (
                                <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                                  No items yet
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        )}
                      </Droppable>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
