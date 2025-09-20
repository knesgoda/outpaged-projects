import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  leading?: ReactNode;
}

export function FilterChip({ active = false, count, leading, className, children, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      {...props}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))]",
        active
          ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] shadow-soft"
          : "border-[hsl(var(--chip-neutral))] text-[hsl(var(--chip-neutral-foreground))] hover:border-[hsl(var(--accent))]/50 hover:text-[hsl(var(--accent))]",
        className,
      )}
    >
      {leading && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--chip-neutral))]/70 text-xs font-bold">{leading}</span>}
      <span>{children}</span>
      {typeof count === "number" && (
        <span className="rounded-full bg-[hsl(var(--chip-neutral))] px-2 py-0.5 text-xs font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}
