import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { WorkloadRow } from "@/types";
import { UNASSIGNED_KEY } from "@/services/workload";

const MINUTES_PER_HOUR = 60;
const WEEKLY_CAPACITY_MINUTES = 40 * MINUTES_PER_HOUR;

function formatHours(minutes: number) {
  const hours = minutes / MINUTES_PER_HOUR;
  return hours.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

type AssigneeMeta = {
  name: string;
  avatarUrl?: string | null;
};

type WorkloadTableProps = {
  rows: WorkloadRow[];
  includeTime: boolean;
  assigneeMeta: Map<string, AssigneeMeta>;
  onSelectAssignee: (assignee: string | null) => void;
  activeAssigneeKey: string | null;
};

export function WorkloadTable({
  rows,
  includeTime,
  assigneeMeta,
  onSelectAssignee,
  activeAssigneeKey,
}: WorkloadTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No workload data for this range.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assignee</TableHead>
            <TableHead className="text-right">Open</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead className="text-right">Estimate (h)</TableHead>
            {includeTime && <TableHead className="text-right">Logged (h)</TableHead>}
            <TableHead>Capacity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const key = row.assignee ?? UNASSIGNED_KEY;
            const meta = assigneeMeta.get(key);
            const name = meta?.name ?? row.assignee_name ?? "Unassigned";
            const avatarUrl = meta?.avatarUrl ?? undefined;
            const estimateMinutes = row.estimate_minutes_total ?? 0;
            const loggedMinutes = row.logged_minutes_total ?? 0;
            const capacityRatio = WEEKLY_CAPACITY_MINUTES
              ? Math.min((estimateMinutes / WEEKLY_CAPACITY_MINUTES) * 100, 100)
              : 0;
            const isOverCapacity = estimateMinutes > WEEKLY_CAPACITY_MINUTES;
            const overdue = row.overdue_tasks;
            const isActive = activeAssigneeKey === key;

            const initials = name
              .split(" ")
              .map((part) => part.charAt(0).toUpperCase())
              .join("")
              .slice(0, 2);

            return (
              <TableRow
                key={key}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => onSelectAssignee(row.assignee ?? null)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectAssignee(row.assignee ?? null);
                  }
                }}
                className={cn(
                  "cursor-pointer",
                  isActive ? "bg-primary/5" : "hover:bg-muted/60"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                      <AvatarFallback>{initials || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{name}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.open_tasks} open tasks
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{row.open_tasks}</TableCell>
                <TableCell className="text-right">
                  <span className={cn("font-medium", overdue > 0 && "text-destructive")}>{overdue}</span>
                </TableCell>
                <TableCell className="text-right">{formatHours(estimateMinutes)}</TableCell>
                {includeTime && (
                  <TableCell className="text-right">{formatHours(loggedMinutes)}</TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <Progress value={capacityRatio} aria-label={`Capacity used ${Math.round(capacityRatio)} percent`} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatHours(estimateMinutes)}h / 40h</span>
                      {isOverCapacity && <Badge variant="destructive">Over</Badge>}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
