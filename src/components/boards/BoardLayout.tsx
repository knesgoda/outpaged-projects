import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ArrowDownUp,
  LayoutGrid,
  Rows3,
  Share2,
  SlidersHorizontal,
  Star,
  StarOff,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { ItemPanel } from "./ItemPanel"
import { LeftSidebar } from "./LeftSidebar"
import type {
  BoardBreadcrumb,
  BoardItemSummary,
  BoardMetricChip,
  BoardQuickFilter,
  BoardGroupSummary,
  BoardLegendItem,
} from "./types"

export interface BoardLayoutProps {
  breadcrumbs: BoardBreadcrumb[]
  items: BoardItemSummary[]
  metrics?: BoardMetricChip[]
  viewOptions: string[]
  activeView: string
  onViewChange: (value: string) => void
  filters?: React.ReactNode
  onShare?: () => void
  onGroupToggle?: (value: boolean) => void
  onSortToggle?: (value: boolean) => void
  onSwimlaneToggle?: (value: boolean) => void
  initialIsStarred?: boolean
  onStarChange?: (value: boolean) => void
  leftSidebar?: {
    groups: BoardGroupSummary[]
    quickFilters?: BoardQuickFilter[]
    legends?: BoardLegendItem[]
  }
  virtualizationThreshold?: number
  virtualizationBreakpoint?: number
  estimatedItemHeight?: number
  className?: string
  renderItem?: (
    item: BoardItemSummary,
    isSelected: boolean,
    onSelect: () => void,
    context: { panelId: string }
  ) => React.ReactNode
}

const DEFAULT_ROW_HEIGHT = 104

function DefaultBoardCard({
  item,
  isSelected,
  onSelect,
  panelId,
}: {
  item: BoardItemSummary
  isSelected: boolean
  onSelect: () => void
  panelId: string
}) {
  const descriptionId = useId()
  const metaId = useId()
  const tagsId = useId()

  const describedBy = [
    item.description ? descriptionId : null,
    item.assignee || item.estimate || item.updatedAt ? metaId : null,
    item.tags?.length ? tagsId : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()

  const statusInitial = item.status?.charAt(0).toUpperCase() || "•"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "board-card w-full rounded-xl border bg-card text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"
      )}
      data-testid="board-card"
      aria-expanded={isSelected}
      aria-controls={panelId}
      aria-describedby={describedBy.length ? describedBy : undefined}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.description ? (
              <p id={descriptionId} className="text-xs text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            ) : null}
          </div>
          {item.status ? (
            <Badge
              variant="outline"
              className="flex items-center gap-2 rounded-full border-muted-foreground/40 bg-muted/40 px-2.5 py-1 text-xs font-medium"
              aria-label={`Status ${item.status}`}
            >
              <span
                aria-hidden="true"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] font-bold uppercase"
              >
                {statusInitial}
              </span>
              <span className="sr-only">Status:</span>
              <span className="capitalize">{item.status}</span>
            </Badge>
          ) : null}
        </div>
        <div
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          id={item.assignee || item.estimate || item.updatedAt ? metaId : undefined}
        >
          {item.assignee ? (
            <span aria-label={`Assignee ${item.assignee}`}>👤 {item.assignee}</span>
          ) : (
            <span>Unassigned</span>
          )}
          {item.estimate ? <span aria-label={`Estimate ${item.estimate}`}>• Est. {item.estimate}</span> : null}
          {item.updatedAt ? <span aria-label={`Last updated ${item.updatedAt}`}>• Updated {item.updatedAt}</span> : null}
        </div>
        {item.tags?.length ? (
          <div className="flex flex-wrap gap-2" id={tagsId}>
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]" aria-label={`Tag ${tag}`}>
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  )
}

export function BoardLayout({
  breadcrumbs,
  items,
  metrics,
  viewOptions,
  activeView,
  onViewChange,
  filters,
  onShare,
  onGroupToggle,
  onSortToggle,
  onSwimlaneToggle,
  initialIsStarred = false,
  onStarChange,
  leftSidebar,
  virtualizationThreshold = 60,
  virtualizationBreakpoint = 1280,
  estimatedItemHeight = DEFAULT_ROW_HEIGHT,
  className,
  renderItem = (item, isSelected, onSelect, context) => (
    <DefaultBoardCard item={item} isSelected={isSelected} onSelect={onSelect} panelId={context.panelId} />
  ),
}: BoardLayoutProps) {
  const [isStarred, setIsStarred] = useState(initialIsStarred)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isGrouped, setIsGrouped] = useState(true)
  const [isSorted, setIsSorted] = useState(false)
  const [isSwimlanes, setIsSwimlanes] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isItemPanelOpen, setIsItemPanelOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(`(max-width: ${virtualizationBreakpoint}px)`).matches
  })
  const boardHeadingId = useId()
  const boardContentId = useId()
  const boardInstructionsId = useId()
  const panelId = useId()
  const boardTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? "Board"

  useEffect(() => {
    if (typeof window === "undefined") return
    const query = window.matchMedia(`(max-width: ${virtualizationBreakpoint}px)`)
    const update = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = "matches" in event ? event.matches : query.matches
      setIsCompact(matches)
    }

    update(query)

    const handler = (event: MediaQueryListEvent) => update(event)
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handler)
      return () => query.removeEventListener("change", handler)
    }
    query.addListener(handler)
    return () => query.removeListener(handler)
  }, [virtualizationBreakpoint])

  const parentRef = useRef<HTMLDivElement | null>(null)

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  )

  useEffect(() => {
    if (!selectedItem) {
      setIsItemPanelOpen(false)
      return
    }
    setIsItemPanelOpen(true)
  }, [selectedItem])

  const shouldVirtualize = items.length > virtualizationThreshold || isCompact
  const canVirtualize = typeof window !== "undefined" && "ResizeObserver" in window
  const enableVirtualization = shouldVirtualize && canVirtualize

  const rowVirtualizer = useVirtualizer({
    count: enableVirtualization ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 8,
  })

  const virtualItems = enableVirtualization ? rowVirtualizer.getVirtualItems() : []
  const totalSize = enableVirtualization ? rowVirtualizer.getTotalSize() : 0

  const handleToggleStar = useCallback(() => {
    setIsStarred((prev) => {
      const next = !prev
      onStarChange?.(next)
      return next
    })
  }, [onStarChange])

  const handleSelectItem = useCallback((itemId: string) => {
    setSelectedItemId((prev) => (prev === itemId ? null : itemId))
  }, [])

  const metricsContent = metrics?.length ? (
    <div className="mt-4 flex flex-wrap gap-2">
      {metrics.map((metric) => {
        const trendIcon =
          metric.trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden="true" />
          ) : metric.trend === "down" ? (
            <TrendingDown className="h-3 w-3 text-rose-500" aria-hidden="true" />
          ) : null

        return (
          <Badge
            key={metric.label}
            variant="outline"
            className="flex items-center gap-1 rounded-full border-muted-foreground/40 bg-muted/50 px-3 py-1 text-xs font-medium"
          >
            {trendIcon}
            <span>{metric.label}:</span>
            <span className="text-foreground">{metric.value}</span>
            {metric.changeLabel ? <span className="text-muted-foreground">({metric.changeLabel})</span> : null}
          </Badge>
        )
      })}
    </div>
  ) : null

  const handleGroupToggle = useCallback(
    (value: boolean) => {
      setIsGrouped(value)
      onGroupToggle?.(value)
    },
    [onGroupToggle]
  )

  const handleSortToggle = useCallback(
    (value: boolean) => {
      setIsSorted(value)
      onSortToggle?.(value)
    },
    [onSortToggle]
  )

  const handleSwimlaneToggle = useCallback(
    (value: boolean) => {
      setIsSwimlanes(value)
      onSwimlaneToggle?.(value)
    },
    [onSwimlaneToggle]
  )

  return (
    <TooltipProvider>
      <div className={cn("relative flex h-full min-h-[720px] flex-col bg-muted/10", className)}>
        <a href={`#${boardContentId}`} className="skip-link">
          Skip to board content
        </a>
        <header className="border-b bg-background px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <h1 id={boardHeadingId} className="sr-only">
                {boardTitle}
              </h1>
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1
                    return (
                      <Fragment key={`${crumb.label}-${index}`}>
                        <BreadcrumbItem>
                          {isLast || !crumb.href ? (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLast ? <BreadcrumbSeparator /> : null}
                      </Fragment>
                    )
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              <p id={boardInstructionsId} className="sr-only">
                Use the board canvas to explore work items. Selecting an item opens its details in the side panel.
              </p>
              {metricsContent}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isStarred ? "default" : "outline"}
                size="icon"
                aria-label={isStarred ? "Unstar board" : "Star board"}
                onClick={handleToggleStar}
              >
                {isStarred ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="icon" aria-label="Share board" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar
            collapsed={isLeftCollapsed}
            onToggle={() => setIsLeftCollapsed((value) => !value)}
            groups={leftSidebar?.groups ?? []}
            quickFilters={leftSidebar?.quickFilters}
            legends={leftSidebar?.legends}
          />

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-background/80 px-6 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={activeView}
                  onValueChange={(value) => value && onViewChange(value)}
                  className="flex flex-wrap"
                >
                  {viewOptions.map((view) => (
                    <ToggleGroupItem key={view} value={view} aria-label={`Switch to ${view} view`}>
                      {view}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {filters}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                  pressed={isGrouped}
                  onPressedChange={handleGroupToggle}
                  aria-label="Toggle group by"
                >
                  <LayoutGrid className="mr-2 h-4 w-4" /> Group
                </Toggle>
                <Toggle pressed={isSorted} onPressedChange={handleSortToggle} aria-label="Toggle sorting">
                  <ArrowDownUp className="mr-2 h-4 w-4" /> Sort
                </Toggle>
                <Toggle
                  pressed={isSwimlanes}
                  onPressedChange={handleSwimlaneToggle}
                  aria-label="Toggle swimlanes"
                >
                  <Rows3 className="mr-2 h-4 w-4" /> Swimlanes
                </Toggle>
                <Button type="button" variant="outline" size="sm">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div
                ref={parentRef}
                className="h-full overflow-auto focus:outline-none"
                data-testid="board-canvas"
                data-virtualized={enableVirtualization}
                id={boardContentId}
                tabIndex={-1}
                role="region"
                aria-labelledby={boardHeadingId}
                aria-describedby={boardInstructionsId}
              >
                {enableVirtualization ? (
                  <ul
                    style={{
                      height: `${totalSize}px`,
                      width: "100%",
                      position: "relative",
                      margin: 0,
                      padding: 0,
                    }}
                    className="relative list-none"
                    aria-label={`${boardTitle} items`}
                    aria-describedby={boardInstructionsId}
                  >
                    {virtualItems.map((virtualRow) => {
                      const item = items[virtualRow.index]
                      const content = renderItem(
                        item,
                        item.id === selectedItemId,
                        () => handleSelectItem(item.id),
                        { panelId }
                      )
                      return (
                        <li
                          key={item.id}
                          data-index={virtualRow.index}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className="list-none"
                        >
                          {content}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <ul
                    className="space-y-3 p-6 list-none"
                    aria-label={`${boardTitle} items`}
                    aria-describedby={boardInstructionsId}
                  >
                    {items.map((item) => (
                      <li key={item.id} className="list-none">
                        {renderItem(item, item.id === selectedItemId, () => handleSelectItem(item.id), { panelId })}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <ItemPanel
            isOpen={isItemPanelOpen}
            onClose={() => setIsItemPanelOpen(false)}
            item={selectedItem}
            id={panelId}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
