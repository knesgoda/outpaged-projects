import { Card, CardContent } from "@/components/ui/card";

type CounterWidgetProps = {
  value: number;
  label?: string;
  comparisonLabel?: string;
  comparisonValue?: number;
};

export function CounterWidget({ value, label, comparisonLabel, comparisonValue }: CounterWidgetProps) {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="flex flex-col gap-2 p-0">
        {label && <span className="text-sm text-muted-foreground">{label}</span>}
        <span className="text-3xl font-bold">{value.toLocaleString()}</span>
        {comparisonLabel && comparisonValue !== undefined && (
          <span className="text-xs text-muted-foreground">
            {comparisonLabel}: {comparisonValue.toLocaleString()}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
