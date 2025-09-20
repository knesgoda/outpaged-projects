import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES: Record<StatusChipVariant, string> = {
  neutral: "bg-[hsl(var(--chip-neutral))] text-[hsl(var(--chip-neutral-foreground))]",
  info: "bg-[hsl(var(--chip-info))] text-[hsl(var(--chip-info-foreground))]",
  success: "bg-[hsl(var(--chip-success))] text-[hsl(var(--chip-success-foreground))]",
  warning: "bg-[hsl(var(--chip-warning))] text-[hsl(var(--chip-warning-foreground))]",
  danger: "bg-[hsl(var(--chip-danger))] text-[hsl(var(--chip-danger-foreground))]",
  accent: "bg-[hsl(var(--chip-accent))] text-[hsl(var(--chip-accent-foreground))]",
};

type StatusChipVariant = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

type StatusChipSize = "sm" | "md";

const SIZE_CLASSES: Record<StatusChipSize, string> = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-3.5 py-1 text-sm",
};

interface StatusChipProps {
  children: ReactNode;
  variant?: StatusChipVariant;
  size?: StatusChipSize;
  className?: string;
  leadingIcon?: ReactNode;
}

export function StatusChip({
  children,
  variant = "neutral",
  size = "sm",
  className,
  leadingIcon,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-tight",
        "shadow-[0_1px_0_rgba(15,23,42,0.06)]",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
    >
      {leadingIcon && <span className="grid place-items-center text-[0.7em]">{leadingIcon}</span>}
      <span>{children}</span>
    </span>
  );
}
