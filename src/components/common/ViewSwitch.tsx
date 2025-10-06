import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day";

interface ViewSwitchProps {
  value: CalendarView;
  onChange: (value: CalendarView) => void;
  className?: string;
}

const OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

export function ViewSwitch({ value, onChange, className }: ViewSwitchProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as CalendarView);
        }
      }}
      className={cn("rounded-md border p-1", className)}
      aria-label="Select calendar view"
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="px-3 py-2 text-sm">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
