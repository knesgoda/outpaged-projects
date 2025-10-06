import { cn } from "@/lib/utils";

export type LinePoint = {
  label: string;
  value: number;
};

export type LineSeries = {
  id: string;
  label: string;
  points: LinePoint[];
  color?: string;
};

type LineChartWidgetProps = {
  series: LineSeries[];
  className?: string;
};

export function LineChartWidget({ series, className }: LineChartWidgetProps) {
  const normalizedSeries = series.filter((item) => item.points.length > 0);

  if (normalizedSeries.length === 0) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }

  const labels = Array.from(
    new Set(normalizedSeries.flatMap((item) => item.points.map((point) => point.label)))
  );

  labels.sort((a, b) => {
    const aDate = Date.parse(a);
    const bDate = Date.parse(b);
    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
      return aDate - bDate;
    }
    return a.localeCompare(b);
  });

  const width = 260;
  const height = 160;
  const padding = 20;
  const max = Math.max(
    ...normalizedSeries.flatMap((item) => item.points.map((point) => point.value)),
    1
  );
  const step = (width - padding * 2) / Math.max(labels.length - 1, 1);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
        {normalizedSeries.map((item, seriesIndex) => {
          const points = labels.map((label, index) => {
            const found = item.points.find((point) => point.label === label);
            const value = found?.value ?? 0;
            const x = padding + step * index;
            const y = height - padding - (value / max) * (height - padding * 2);
            return `${x},${y}`;
          });

          const stroke =
            item.color ??
            `hsl(${(seriesIndex * 90) % 360} 70% 55%)`;

          return (
            <polyline
              key={item.id}
              fill="none"
              stroke={stroke}
              strokeWidth={2}
              points={points.join(" ")}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {labels.map((label) => (
          <span key={label}>
            {label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {normalizedSeries.map((item, index) => {
          const color = item.color ?? `hsl(${(index * 90) % 360} 70% 55%)`;
          const latest = item.points[item.points.length - 1]?.value ?? 0;
          return (
            <span key={item.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {item.label}: <span className="font-medium text-foreground">{latest.toLocaleString()}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
