import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MasterBoardViewFilters } from "@/types/boards";
import { useBoardViewContext } from "./context";
import {
  EMPTY_FILTERS,
  aggregateMasterGroups,
  buildMasterFilterOptions,
  filterMasterRecords,
  normaliseMasterFilters,
  type MasterBoardRecord,
} from "./masterDataset";

const filtersEqual = (left: MasterBoardViewFilters, right: MasterBoardViewFilters) => {
  const normalise = (values: string[]) => [...values].sort().join("|");
  return (
    normalise(left.projectIds) === normalise(right.projectIds) &&
    normalise(left.componentIds) === normalise(right.componentIds) &&
    normalise(left.versionIds) === normalise(right.versionIds)
  );
};

interface FilterPillProps {
  label: string;
  value: string;
  isActive: boolean;
  onToggle: (value: string) => void;
}

function FilterPill({ label, value, isActive, onToggle }: FilterPillProps) {
  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={cn("rounded-full text-xs", isActive ? "shadow-sm" : "text-muted-foreground")}
      onClick={() => onToggle(value)}
    >
      {label}
    </Button>
  );
}

interface FilterSectionProps {
  title: string;
  values: string[];
  active: string[];
  onToggle: (value: string) => void;
}

function FilterSection({ title, values, active, onToggle }: FilterSectionProps) {
  if (!values.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {values.map((value) => (
        <FilterPill
          key={`${title}-${value}`}
          label={value}
          value={value}
          isActive={active.includes(value)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export function MasterBoardView() {
  const { items, configuration, isLoading, updateConfiguration } = useBoardViewContext();
  const records = useMemo(() => (items as MasterBoardRecord[]).map((record) => ({ ...record })), [items]);

  const derivedConfigFilters = useMemo(
    () => normaliseMasterFilters(configuration.master?.filters),
    [configuration.master?.filters]
  );

  const [filters, setFilters] = useState<MasterBoardViewFilters>(derivedConfigFilters);

  useEffect(() => {
    setFilters((current) => (filtersEqual(current, derivedConfigFilters) ? current : derivedConfigFilters));
  }, [derivedConfigFilters]);

  const persistFilters = useCallback(
    (updater: (current: MasterBoardViewFilters) => MasterBoardViewFilters) => {
      setFilters((current) => {
        const next = updater(current);
        if (!filtersEqual(next, current)) {
          const payload = { ...(configuration.master ?? {}), filters: next };
          updateConfiguration({ master: payload });
        }
        return next;
      });
    },
    [configuration.master, updateConfiguration]
  );

  const toggleFilter = useCallback(
    (key: keyof MasterBoardViewFilters, value: string) => {
      persistFilters((current) => {
        const set = new Set(current[key]);
        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }
        return { ...current, [key]: Array.from(set) };
      });
    },
    [persistFilters]
  );

  const clearFilters = useCallback(() => {
    persistFilters(() => ({ ...EMPTY_FILTERS }));
  }, [persistFilters]);

  const filteredRecords = useMemo(
    () => filterMasterRecords(records, filters),
    [records, filters]
  );

  const groups = useMemo(() => aggregateMasterGroups(filteredRecords), [filteredRecords]);
  const filterOptions = useMemo(() => buildMasterFilterOptions(records), [records]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Cross-project filters</h3>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={clearFilters}
            disabled={filtersEqual(filters, EMPTY_FILTERS)}
          >
            Clear
          </Button>
        </div>

        <div className="space-y-3">
          <FilterSection
            title="Projects"
            values={filterOptions.projects}
            active={filters.projectIds}
            onToggle={(value) => toggleFilter("projectIds", value)}
          />
          <FilterSection
            title="Components"
            values={filterOptions.components}
            active={filters.componentIds}
            onToggle={(value) => toggleFilter("componentIds", value)}
          />
          <FilterSection
            title="Versions"
            values={filterOptions.versions}
            active={filters.versionIds}
            onToggle={(value) => toggleFilter("versionIds", value)}
          />
        </div>
      </section>

      {isLoading && groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Loading aggregated boards…
        </div>
      ) : null}

      {!isLoading && groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No matching items across linked boards.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.key} className="overflow-hidden border">
            <div className="h-1 w-full" style={{ backgroundColor: group.color }} />
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">{group.label}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{group.boardName}</Badge>
                <span>
                  {group.completed}/{group.total} complete
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={Math.round(group.progress * 100)} className="h-1.5" />
              <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                {group.projectIds.map((id) => (
                  <Badge key={`${group.key}-project-${id}`} variant="secondary" className="text-[10px]">
                    {id}
                  </Badge>
                ))}
                {group.componentIds.map((id) => (
                  <Badge key={`${group.key}-component-${id}`} variant="outline" className="text-[10px]">
                    {id}
                  </Badge>
                ))}
                {group.versionIds.map((id) => (
                  <Badge key={`${group.key}-version-${id}`} variant="ghost" className="text-[10px]">
                    {id}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default MasterBoardView;
