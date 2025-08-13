import * as React from "react";
import {
  Dialog as BaseDialog,
  DialogContent as BaseDialogContent,
  DialogHeader as BaseDialogHeader,
  DialogFooter as BaseDialogFooter,
  DialogTitle as BaseDialogTitle,
  DialogDescription as BaseDialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet as BaseSheet,
  SheetContent as BaseSheetContent,
  SheetHeader as BaseSheetHeader,
  SheetFooter as BaseSheetFooter,
  SheetTitle as BaseSheetTitle,
  SheetDescription as BaseSheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Responsive Dialog API compatible wrappers
export function ResponsiveDialog(
  props: React.ComponentProps<typeof BaseDialog>
) {
  const isMobile = useIsMobile();
  // Switch root based on device
  if (isMobile) return <BaseSheet {...(props as any)} />;
  return <BaseDialog {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  side = "bottom",
  ...props
}: React.ComponentProps<typeof BaseDialogContent> & { side?: "top" | "bottom" | "left" | "right" }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BaseSheetContent
        side={side}
        className={cn(
          "h-[90svh] w-full rounded-t-xl p-0 overflow-hidden",
          "pb-[max(env(safe-area-inset-bottom),theme(spacing.4))]",
          className
        )}
        {...(props as any)}
      >
        {children}
      </BaseSheetContent>
    );
  }

  return (
    <BaseDialogContent
      className={cn("md:max-h-[90vh] p-0", className)}
      {...props}
    >
      {children}
    </BaseDialogContent>
  );
}

export function ResponsiveDialogHeader(
  props: React.ComponentProps<typeof BaseDialogHeader>
) {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetHeader {...props} />;
  return <BaseDialogHeader {...props} />;
}

export function ResponsiveDialogFooter(
  props: React.ComponentProps<typeof BaseDialogFooter>
) {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetFooter {...props} />;
  return <BaseDialogFooter {...props} />;
}

export function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof BaseDialogTitle>
) {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetTitle {...props} />;
  return <BaseDialogTitle {...props} />;
}

export function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof BaseDialogDescription>
) {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetDescription {...props} />;
  return <BaseDialogDescription {...props} />;
}
