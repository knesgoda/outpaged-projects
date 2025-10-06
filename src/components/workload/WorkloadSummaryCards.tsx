import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlarmClock, ClipboardList, Timer, TimerReset } from "lucide-react";

const MINUTES_PER_HOUR = 60;

function formatHours(minutes: number) {
  const hours = minutes / MINUTES_PER_HOUR;
  return hours.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

type SummaryCardsProps = {
  dateFrom?: Date;
  dateTo?: Date;
  totalOpen: number;
  totalOverdue: number;
  totalEstimateMinutes: number;
  totalLoggedMinutes: number;
  includeTime: boolean;
};

export function WorkloadSummaryCards({
  dateFrom,
  dateTo,
  totalOpen,
  totalOverdue,
  totalEstimateMinutes,
  totalLoggedMinutes,
  includeTime,
}: SummaryCardsProps) {
  const rangeLabel = (() => {
    if (!dateFrom || !dateTo) return "All time";
    const sameDay = dateFrom.toDateString() === dateTo.toDateString();
    if (sameDay) {
      return format(dateFrom, "MMM d, yyyy");
    }
    return `${format(dateFrom, "MMM d")} - ${format(dateTo, "MMM d, yyyy")}`;
  })();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Open tasks</CardTitle>
          <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{totalOpen}</p>
          <p className="text-sm text-muted-foreground">Across {rangeLabel}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Overdue tasks</CardTitle>
          <AlarmClock className="h-4 w-4 text-destructive" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold">{totalOverdue}</p>
            {totalOverdue > 0 && <Badge variant="destructive">Action needed</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">Due before today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Estimate hours</CardTitle>
          <Timer className="h-4 w-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatHours(totalEstimateMinutes)}h</p>
          <p className="text-sm text-muted-foreground">Planned work this period</p>
        </CardContent>
      </Card>

      {includeTime ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Logged hours</CardTitle>
            <TimerReset className="h-4 w-4 text-primary" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatHours(totalLoggedMinutes)}h</p>
            <p className="text-sm text-muted-foreground">Time captured in range</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enable time tracking to compare planned and actual hours.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
