import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type CalendarView =
  | "day"
  | "work-week"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "timeline"
  | "agenda"
  | "gantt"
  | "people"
  | "resources";

interface ViewSwitchProps {
  value: CalendarView;
  onChange: (value: CalendarView) => void;
  className?: string;
}

const OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "day", label: "Day" },
  { value: "work-week", label: "Work Week" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "timeline", label: "Timeline" },
  { value: "agenda", label: "Agenda" },
  { value: "gantt", label: "Gantt" },
  { value: "people", label: "People" },
  { value: "resources", label: "Resources" },
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
