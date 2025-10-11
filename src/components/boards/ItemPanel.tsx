import { memo } from "react"
import { CalendarClock, CircleDashed, Tag, User, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

import type { BoardItemSummary } from "./types"

export interface ItemPanelProps {
  isOpen?: boolean
  onClose?: () => void
  item?: BoardItemSummary | null
  className?: string
  headerActions?: React.ReactNode
  footer?: React.ReactNode
  emptyState?: React.ReactNode
  id?: string
}

function getInitials(name?: string) {
  if (!name) return "?"
  const [first = "", second = ""] = name.split(" ")
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}

export const ItemPanel = memo(function ItemPanel({
  isOpen = false,
  onClose,
  item,
  className,
  headerActions,
  footer,
  emptyState,
  id,
}: ItemPanelProps) {
  return (
    <aside
      id={id ?? "board-item-panel"}
      className={cn(
        "flex h-full flex-col border-l bg-background transition-all duration-200 ease-in-out",
        isOpen ? "w-[360px]" : "w-0",
        !isOpen && "pointer-events-none opacity-0",
        className
      )}
      aria-label="Item detail panel"
      aria-hidden={!isOpen}
      data-state={isOpen ? "open" : "closed"}
    >
      <div className="flex h-12 items-center justify-between border-b px-4">
        <p className="text-sm font-semibold">Item Details</p>
        <div className="flex items-center gap-1">
          {headerActions}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={onClose}
            aria-label="Close item details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {item ? (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold leading-tight text-foreground">{item.title}</h3>
                {item.status ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleDashed className="h-4 w-4" aria-hidden="true" />
                    <span>{item.status}</span>
                  </div>
                ) : null}
              </div>

              {item.description ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <Separator />
                  <p>{item.description}</p>
                </div>
              ) : null}

              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>Assignee</span>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {item.assigneeAvatar ? <AvatarImage src={item.assigneeAvatar} alt={item.assignee} /> : null}
                    <AvatarFallback>{getInitials(item.assignee)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.assignee ?? "Unassigned"}</p>
                    {item.estimate ? (
                      <p className="text-xs text-muted-foreground">Est. {item.estimate}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="mr-1 h-3 w-3" aria-hidden="true" />
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {item.updatedAt ? (
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    <span>Last updated {item.updatedAt}</span>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            emptyState ?? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Select an item to inspect its details</p>
                <p className="text-xs text-muted-foreground">
                  Use the board canvas to choose a work item and the panel will populate with rich context automatically.
                </p>
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {footer ? <div className="border-t p-4">{footer}</div> : null}
    </aside>
  )
})
