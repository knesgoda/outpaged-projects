import { useMemo, type ComponentType } from "react";
import { CircleUserRound, Flame, TimerReset, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/outpaged/FilterChip";

import type { BoardFilterDefinition } from "./types";
import { QUICK_FILTERS } from "./quickFilters";

interface QuickFilterChipsProps {
  definition: BoardFilterDefinition;
  onChange: (definition: BoardFilterDefinition) => void;
}

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  me: CircleUserRound,
  overdue: TimerReset,
  blocked: ShieldAlert,
  high_priority: Flame,
};

export function QuickFilterChips({ definition, onChange }: QuickFilterChipsProps) {
  const quickFilters = useMemo(() => QUICK_FILTERS, []);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick board filters">
      {quickFilters.map((filter) => {
        const Icon = ICON_MAP[filter.id] ?? CircleUserRound;
        const active = filter.isActive?.(definition) ?? false;
        return (
          <FilterChip
            key={filter.id}
            active={active}
            onClick={() =>
              onChange(active ? filter.clear?.(definition) ?? definition : filter.apply(definition))
            }
            className={cn("px-3", active && "bg-primary text-primary-foreground")}
            leading={<Icon className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
            aria-pressed={active}
            aria-label={filter.label}
          >
            {filter.label}
          </FilterChip>
        );
      })}
    </div>
  );
}
