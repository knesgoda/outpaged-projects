import {
  Fragment,
  useCallback,
  useEffect,
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
  renderItem?: (item: BoardItemSummary, isSelected: boolean, onSelect: () => void) => React.ReactNode
}

const DEFAULT_ROW_HEIGHT = 104

function DefaultBoardCard({
  item,
  isSelected,
  onSelect,
}: {
  item: BoardItemSummary
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border bg-card text-left shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
        isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"
      )}
      data-testid="board-card"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
            ) : null}
          </div>
          {item.status ? (
            <Badge variant="outline" className="shrink-0 text-xs capitalize">
              {item.status}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.assignee ? <span>👤 {item.assignee}</span> : <span>Unassigned</span>}
          {item.estimate ? <span>• Est. {item.estimate}</span> : null}
          {item.updatedAt ? <span>• Updated {item.updatedAt}</span> : null}
        </div>
        {item.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
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
  renderItem = (item, isSelected, onSelect) => (
    <DefaultBoardCard key={item.id} item={item} isSelected={isSelected} onSelect={onSelect} />
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
      <div className={cn("flex h-full min-h-[720px] flex-col bg-muted/10", className)}>
        <header className="border-b bg-background px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
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
                className="h-full overflow-auto"
                data-testid="board-canvas"
                data-virtualized={enableVirtualization}
              >
                {enableVirtualization ? (
                  <div
                    style={{
                      height: `${totalSize}px`,
                      width: "100%",
                      position: "relative",
                    }}
                    aria-label="Virtualized board canvas"
                  >
                    {virtualItems.map((virtualRow) => {
                      const item = items[virtualRow.index]
                      const content = renderItem(item, item.id === selectedItemId, () => handleSelectItem(item.id))
                      return (
                        <div
                          key={item.id}
                          data-index={virtualRow.index}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          {content}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-3 p-6" aria-label="Board canvas">
                    {items.map((item) => (
                      <Fragment key={item.id}>
                        {renderItem(item, item.id === selectedItemId, () => handleSelectItem(item.id))}
                      </Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <ItemPanel
            isOpen={isItemPanelOpen}
            onClose={() => setIsItemPanelOpen(false)}
            item={selectedItem}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
