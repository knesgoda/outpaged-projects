import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";

const DAILY_CAPACITY_MINUTES = 8 * 60;

export type HeatmapDay = {
  key: string; // yyyy-MM-dd
  label: string;
  shortLabel: string;
};

export type HeatmapRow = {
  assigneeKey: string;
  assigneeName: string;
  values: Record<string, number>;
};

type WorkloadHeatmapProps = {
  days: HeatmapDay[];
  rows: HeatmapRow[];
};

export function WorkloadHeatmap({ days, rows }: WorkloadHeatmapProps) {
  const columnTemplate = useMemo(() => {
    const dayColumns = Array.from({ length: days.length }).map(() => "48px");
    return `minmax(120px,200px) ${dayColumns.join(" ")}`;
  }, [days.length]);

  if (rows.length === 0 || days.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Capacity heatmap</h2>
        <span className="text-xs text-muted-foreground">Intensity shows estimated hours per day</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: columnTemplate }}
            role="table"
            aria-label="Workload heatmap"
          >
            <div />
            {days.map((day) => (
              <div key={day.key} className="text-center text-xs font-medium text-muted-foreground">
                {day.shortLabel}
              </div>
            ))}
            {rows.map((row) => (
              <Fragment key={row.assigneeKey}>
                <div className="truncate text-sm font-medium">
                  {row.assigneeName}
                </div>
                {days.map((day) => {
                  const minutes = row.values[day.key] ?? 0;
                  const ratio = Math.min(minutes / DAILY_CAPACITY_MINUTES, 1);
                  const hasWork = minutes > 0;
                  const hoursText = (minutes / 60).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  });
                  const ariaLabel = `${row.assigneeName} on ${day.label}: ${hoursText} hours`;

                  return (
                    <div
                      key={`${row.assigneeKey}-${day.key}`}
                      role="img"
                      aria-label={ariaLabel}
                      title={ariaLabel}
                      className={cn(
                        "h-10 w-12 rounded-md border",
                        hasWork ? "border-transparent" : "border-border bg-muted"
                      )}
                      style={
                        hasWork
                          ? {
                              backgroundColor: "hsl(var(--primary))",
                              opacity: 0.2 + ratio * 0.8,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
