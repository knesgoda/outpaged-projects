import { cn } from "@/lib/utils";

type BarChartDatum = {
  label: string;
  value: number;
};

type BarChartWidgetProps = {
  data: BarChartDatum[];
  orientation?: "vertical" | "horizontal";
  className?: string;
};

export function BarChartWidget({ data, orientation = "vertical", className }: BarChartWidgetProps) {
  const max = Math.max(...data.map((datum) => datum.value), 1);

  return (
    <div className={cn("flex w-full gap-3", orientation === "vertical" ? "items-end" : "flex-col", className)}>
      {data.map((datum) => {
        const size = Math.max((datum.value / max) * 100, 4);
        return (
          <div
            key={datum.label}
            className={cn(
              "flex min-w-[40px] flex-col items-center gap-2 text-xs",
              orientation === "horizontal" && "flex-row"
            )}
          >
            <div
              className={cn(
                "rounded-md bg-primary/70",
                orientation === "vertical" ? "w-full" : "h-3"
              )}
              style={orientation === "vertical" ? { height: `${size}%` } : { width: `${size}%` }}
            />
            <span className="text-xs text-muted-foreground">{datum.label}</span>
            <span className="text-sm font-medium">{datum.value.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}
