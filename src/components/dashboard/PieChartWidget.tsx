import { useMemo } from "react";

const TWO_PI = Math.PI * 2;

type PieDatum = {
  label: string;
  value: number;
  color?: string;
};

type PieChartWidgetProps = {
  data: PieDatum[];
  size?: number;
};

export function PieChartWidget({ data, size = 140 }: PieChartWidgetProps) {
  const total = Math.max(data.reduce((sum, datum) => sum + datum.value, 0), 1);
  const segments = useMemo(() => {
    let startAngle = 0;
    return data.map((datum) => {
      const angle = (datum.value / total) * TWO_PI;
      const segment = { startAngle, angle, datum };
      startAngle += angle;
      return segment;
    });
  }, [data, total]);

  const radius = size / 2;
  const center = radius;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Pie chart">
        {segments.map(({ startAngle, angle, datum }) => {
          const endAngle = startAngle + angle;
          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          const fill = datum.color ?? `hsl(${Math.floor(Math.random() * 360)} 70% 60%)`;
          return <path key={datum.label} d={pathData} fill={fill} stroke="var(--border)" strokeWidth={1} />;
        })}
      </svg>
      <ul className="space-y-1 text-xs">
        {data.map((datum) => (
          <li key={datum.label} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: datum.color ?? "hsl(var(--primary))" }} />
            <span className="font-medium">{datum.label}</span>
            <span className="text-muted-foreground">{datum.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
