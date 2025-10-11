import { useMemo, type ComponentType } from "react";
import { CircleUserRound, Flame, TimerReset, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/outpaged/FilterChip";

import type { BoardFilterDefinition } from "./types";
import { QUICK_FILTERS, QUICK_FILTER_COMBINATIONS } from "./quickFilters";
import type { BoardQuickFilterCombination } from "./types";

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
  const filterMap = useMemo(() => {
    const map = new Map<string, typeof quickFilters[number]>();
    quickFilters.forEach((filter) => map.set(filter.id, filter));
    return map;
  }, [quickFilters]);

  const handleCombinationToggle = (combination: BoardQuickFilterCombination) => {
    const isActive = combination.filters.every((id) => {
      const filter = filterMap.get(id);
      return filter?.isActive?.(definition) ?? false;
    });

    let next = definition;

    if (isActive) {
      combination.filters.forEach((id) => {
        const filter = filterMap.get(id);
        if (filter?.clear) {
          next = filter.clear(next);
        }
      });
    } else {
      combination.filters.forEach((id) => {
        const filter = filterMap.get(id);
        if (!filter) return;
        const alreadyActive = filter.isActive?.(next) ?? false;
        if (!alreadyActive) {
          next = filter.apply(next);
        }
      });
    }

    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Quick board filters">
      <div className="flex flex-wrap items-center gap-2">
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
      {QUICK_FILTER_COMBINATIONS.length ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Quick filter combinations">
          {QUICK_FILTER_COMBINATIONS.map((combination) => {
            const active = combination.filters.every((id) => {
              const filter = filterMap.get(id);
              return filter?.isActive?.(definition) ?? false;
            });
            return (
              <FilterChip
                key={combination.id}
                active={active}
                onClick={() => handleCombinationToggle(combination)}
                className={cn(
                  "px-3",
                  active && "bg-secondary text-secondary-foreground"
                )}
                aria-pressed={active}
                aria-label={combination.label}
              >
                {combination.label}
              </FilterChip>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
