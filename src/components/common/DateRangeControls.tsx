import { addDays, addMonths, addWeeks, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarUnit = "day" | "week" | "month";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeControlsProps {
  unit: CalendarUnit;
  range: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

function getUnitHelpers(unit: CalendarUnit) {
  switch (unit) {
    case "day":
      return {
        prev: (date: Date) => addDays(date, -1),
        next: (date: Date) => addDays(date, 1),
        normalize: (date: Date) => ({ from: startOfDay(date), to: endOfDay(date) }),
      };
    case "week":
      return {
        prev: (date: Date) => addWeeks(date, -1),
        next: (date: Date) => addWeeks(date, 1),
        normalize: (date: Date) => ({ from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) }),
      };
    case "month":
    default:
      return {
        prev: (date: Date) => addMonths(date, -1),
        next: (date: Date) => addMonths(date, 1),
        normalize: (date: Date) => ({ from: startOfMonth(date), to: endOfMonth(date) }),
      };
  }
}

export function DateRangeControls({ unit, range, onChange, className }: DateRangeControlsProps) {
  const helpers = getUnitHelpers(unit);

  const goTo = (date: Date) => {
    const normalized = helpers.normalize(date);
    onChange(normalized);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" size="sm" onClick={() => goTo(helpers.prev(range.from))} aria-label="Previous">
        Prev
      </Button>
      <Button variant="outline" size="sm" onClick={() => goTo(new Date())} aria-label="Today">
        Today
      </Button>
      <Button variant="outline" size="sm" onClick={() => goTo(helpers.next(range.from))} aria-label="Next">
        Next
      </Button>
    </div>
  );
}
