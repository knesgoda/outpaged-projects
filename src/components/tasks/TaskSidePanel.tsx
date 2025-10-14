import { useEffect, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTaskPanelRouter } from "@/state/taskPanelRouter";

interface TaskSidePanelProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function TaskSidePanel({ title, description, children, footer }: TaskSidePanelProps) {
  const { isOpen, close, isMobile } = useTaskPanelRouter();

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <Sheet open={isOpen} onOpenChange={(value) => (!value ? close() : undefined)}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-full" : "max-w-3xl w-full"}>
        <SheetHeader className="space-y-1">
          <SheetTitle>{title ?? "Task"}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">{children}</div>
        </ScrollArea>
        {footer ? <div className="border-t pt-4 mt-4">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}
