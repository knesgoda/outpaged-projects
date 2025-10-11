import { memo, type CSSProperties } from "react"
import { ChevronLeft, ChevronRight, Filter, Layers3, ListTree } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import type {
  BoardGroupSummary,
  BoardLegendItem,
  BoardQuickFilter,
} from "./types"

export interface LeftSidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  groups: BoardGroupSummary[]
  activeGroupId?: string | null
  onSelectGroup?: (groupId: string) => void
  quickFilters?: BoardQuickFilter[]
  onToggleQuickFilter?: (filterId: string) => void
  legends?: BoardLegendItem[]
  className?: string
}

function renderGroupAccent(group: BoardGroupSummary) {
  const initial = group.name.charAt(0).toUpperCase() || "•"
  const style: CSSProperties = {}

  if (group.accentColor) {
    style.borderColor = group.accentColor
    style.color = group.accentColor
  }

  return (
    <span
      aria-hidden="true"
      className="mr-2 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold leading-none"
      style={style}
    >
      {initial}
    </span>
  )
}

function renderLegendSwatch(item: BoardLegendItem) {
  return (
    <span
      aria-hidden="true"
      className="mr-2 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full"
      style={{ backgroundColor: item.color }}
    />
  )
}

export const LeftSidebar = memo(function LeftSidebar({
  collapsed = false,
  onToggle,
  groups,
  activeGroupId,
  onSelectGroup,
  quickFilters,
  onToggleQuickFilter,
  legends,
  className,
}: LeftSidebarProps) {
  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r bg-background transition-all duration-200 ease-in-out",
        collapsed ? "w-[52px]" : "w-72",
        className
      )}
      data-state={collapsed ? "collapsed" : "expanded"}
      aria-label="Board navigation"
    >
      <div className="flex h-12 items-center justify-between border-b px-2">
        {!collapsed && <h2 className="text-sm font-semibold">Board Context</h2>}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={collapsed ? "Expand board sidebar" : "Collapse board sidebar"}
              onClick={onToggle}
              className="text-muted-foreground"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{collapsed ? "Show contextual panels" : "Hide contextual panels"}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {!collapsed ? (
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            <section aria-labelledby="board-groups-heading" className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span id="board-groups-heading">Groups</span>
              </div>
              <ul className="space-y-1" data-testid="board-groups">
                {groups.map((group) => {
                  const isActive = group.id === activeGroupId
                  return (
                    <li key={group.id}>
                      <Button
                        type="button"
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn("w-full justify-start gap-2", isActive && "shadow-sm")}
                        onClick={() => onSelectGroup?.(group.id)}
                        aria-pressed={isActive}
                      >
                        {renderGroupAccent(group)}
                        <span className="flex-1 truncate text-left">{group.name}</span>
                        <span className="ml-auto flex items-center gap-2">
                          {group.archived ? (
                            <Badge
                              variant="destructive"
                              className="shrink-0 text-[10px] uppercase"
                              data-testid="archived-group-badge"
                            >
                              Archived
                            </Badge>
                          ) : null}
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {group.count}
                          </Badge>
                        </span>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </section>

            {quickFilters?.length ? (
              <section aria-labelledby="board-quick-filters" className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  <span id="board-quick-filters">Quick Filters</span>
                </div>
                <div className="grid grid-cols-1 gap-2" data-testid="board-quick-filters">
                  {quickFilters.map((filter) => (
                    <Button
                      key={filter.id}
                      type="button"
                      variant={filter.active ? "default" : "outline"}
                      size="sm"
                      className="justify-between"
                      onClick={() => onToggleQuickFilter?.(filter.id)}
                      aria-pressed={filter.active}
                    >
                      <span className="truncate text-left">{filter.label}</span>
                      {filter.description && (
                        <span className="text-xs text-muted-foreground">{filter.description}</span>
                      )}
                    </Button>
                  ))}
                </div>
              </section>
            ) : null}

            {legends?.length ? (
              <>
                <Separator />
                <section aria-labelledby="board-legends" className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
                    <span id="board-legends">Legends</span>
                  </div>
                  <ul className="space-y-2" data-testid="board-legends">
                    {legends.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                        {renderLegendSwatch(item)}
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{item.label}</p>
                          {item.description ? <p className="text-xs">{item.description}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-4 py-4" aria-hidden="true">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full"
                onClick={() => onSelectGroup?.(groups[0]?.id ?? "")}
              >
                <Layers3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Groups</TooltipContent>
          </Tooltip>
          {quickFilters?.length ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => quickFilters[0] && onToggleQuickFilter?.(quickFilters[0].id)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Quick filters</TooltipContent>
            </Tooltip>
          ) : null}
          {legends?.length ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant="ghost" className="rounded-full">
                  <ListTree className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Legends</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      )}
    </aside>
  )
})
