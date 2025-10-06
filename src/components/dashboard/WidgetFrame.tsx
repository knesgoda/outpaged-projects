import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type WidgetFrameProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  className?: string;
};

export function WidgetFrame({
  title,
  subtitle,
  children,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  className,
}: WidgetFrameProps) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <h3 className="text-base font-semibold leading-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1">
          {onMoveUp && (
            <Button variant="ghost" size="icon" onClick={onMoveUp} aria-label="Move widget up">
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          {onMoveDown && (
            <Button variant="ghost" size="icon" onClick={onMoveDown} aria-label="Move widget down">
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
          {(onEdit || onDuplicate || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Widget actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="min-h-[120px] flex-1">{children}</div>
    </div>
  );
}
