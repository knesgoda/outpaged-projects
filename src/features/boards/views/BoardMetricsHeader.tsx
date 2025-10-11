import { memo, useMemo } from "react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calculateBoardMetrics,
  buildBoardMetricDisplays,
  type BoardMetricDisplay,
} from "./metrics";
import type { BoardViewConfiguration, BoardViewRecord } from "./context";
import { Flame, GitBranch, ListTodo, ShieldCheck, Target, TimerReset } from "lucide-react";

const ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  kanban: ListTodo,
  target: Target,
  clock: TimerReset,
  flame: Flame,
  shield: ShieldCheck,
  git: GitBranch,
};

const toneClassNames: Record<BoardMetricDisplay["tone"], string> = {
  neutral: "bg-muted/60 text-foreground border-border",
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-200",
  critical: "bg-destructive/10 text-destructive border-destructive/40",
};

export interface BoardMetricsHeaderProps {
  items: BoardViewRecord[];
  configuration: BoardViewConfiguration;
  className?: string;
}

function MetricChip({ metric }: { metric: BoardMetricDisplay }) {
  const Icon = ICON_MAP[metric.icon] ?? ListTodo;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex min-w-[180px] flex-1 items-center justify-between rounded-lg border px-4 py-3 text-left shadow-sm transition", 
            "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
            toneClassNames[metric.tone]
          )}
        >
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-background/60 p-1.5">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </span>
              <span className="text-base font-semibold leading-tight">{metric.value}</span>
              {metric.changeLabel ? (
                <span className="text-xs text-muted-foreground">{metric.changeLabel}</span>
              ) : null}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-sm">
        {metric.tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export const BoardMetricsHeader = memo(function BoardMetricsHeader({
  items,
  configuration,
  className,
}: BoardMetricsHeaderProps) {
  const { summary, metrics } = useMemo(() => {
    const summary = calculateBoardMetrics(items, configuration);
    return { summary, metrics: buildBoardMetricDisplays(summary) };
  }, [configuration, items]);

  const epicRollups = summary.epics.slice(0, 4);

  if (!metrics.length) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
          {metrics.map((metric) => (
            <MetricChip key={metric.id} metric={metric} />
          ))}
        </div>
        {epicRollups.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {epicRollups.map((epic) => (
              <div
                key={epic.epicId}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-xs uppercase text-muted-foreground">Epic</p>
                  <p className="text-sm font-semibold text-foreground">{epic.epicLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {epic.completed}/{epic.total}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(epic.progress * 100)}% complete
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
});

