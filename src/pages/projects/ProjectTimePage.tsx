import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useProjectId } from "@/hooks/useProjectId";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimeEntryRow {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_running: boolean;
  description: string | null;
  tasks: { id: string; title: string | null } | null;
  user: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export default function ProjectTimePage() {
  const projectId = useProjectId() ?? "";
  useDocumentTitle(`Projects / ${projectId || "Project"} / Time`);

  const entriesQuery = useQuery<TimeEntryRow[]>({
    queryKey: ["project", projectId, "time"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("time_entries")
        .select(
          "id, task_id, user_id, started_at, ended_at, duration_minutes, is_running, description, " +
            "tasks:tasks!time_entries_task_id_fkey(id, title, project_id), " +
            "user:profiles!time_entries_user_id_fkey(id, full_name, avatar_url)"
        )
        .eq("tasks.project_id", projectId)
        .order("started_at", { ascending: false })
        .limit(500);

      if (error) {
        throw error;
      }

      return (data as unknown as TimeEntryRow[]) ?? [];
    },
  });

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);

  const summary = useMemo(() => {
    const totals = entries.reduce(
      (acc, entry) => {
        const minutes = entry.duration_minutes ?? (entry.ended_at ? minutesBetween(entry.started_at, entry.ended_at) : 0);
        acc.totalMinutes += minutes;
        acc.running += entry.is_running ? 1 : 0;
        acc.byUser.set(entry.user_id, (acc.byUser.get(entry.user_id) ?? 0) + minutes);
        return acc;
      },
      { totalMinutes: 0, running: 0, byUser: new Map<string, number>() },
    );

    const topUserId = Array.from(totals.byUser.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
    return {
      totalHours: totals.totalMinutes / 60,
      running: totals.running,
      topUserId,
    };
  }, [entries]);

  const users = useMemo(() => {
    const map = new Map<
      string,
      {
        user: TimeEntryRow["user"];
        minutes: number;
        entries: number;
        lastEntry: string | null;
      }
    >();

    for (const entry of entries) {
      const minutes = entry.duration_minutes ?? (entry.ended_at ? minutesBetween(entry.started_at, entry.ended_at) : 0);
      const bucket = map.get(entry.user_id) ?? {
        user: entry.user,
        minutes: 0,
        entries: 0,
        lastEntry: null,
      };
      bucket.minutes += minutes;
      bucket.entries += 1;
      if (!bucket.lastEntry || parseISO(entry.started_at) > parseISO(bucket.lastEntry)) {
        bucket.lastEntry = entry.started_at;
      }
      bucket.user = entry.user;
      map.set(entry.user_id, bucket);
    }

    return Array.from(map.values()).sort((left, right) => right.minutes - left.minutes);
  }, [entries]);

  const timesheet = useMemo(() => {
    const grouped = new Map<string, { label: string; logs: TimeEntryRow[]; timestamp: number }>();
    for (const entry of entries) {
      const date = parseISO(entry.started_at);
      const key = format(date, "yyyy-MM-dd");
      const label = format(date, "PP");
      const bucket = grouped.get(key) ?? { label, logs: [], timestamp: date.getTime() };
      bucket.logs.push(entry);
      grouped.set(key, bucket);
    }

    return Array.from(grouped.values())
      .map(group => ({
        label: group.label,
        logs: group.logs.sort((left, right) => parseISO(right.started_at).getTime() - parseISO(left.started_at).getTime()),
        timestamp: group.timestamp,
      }))
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 7);
  }, [entries]);

  const topUser = users.find(entry => entry.user?.id === summary.topUserId) ?? null;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project time</h1>
        <p className="text-sm text-muted-foreground">Understand effort and active timers for this project.</p>
      </header>

      {entriesQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load time entries</AlertTitle>
          <AlertDescription>
            {entriesQuery.error instanceof Error ? entriesQuery.error.message : "Try refreshing the page."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hours logged</CardTitle>
          </CardHeader>
          <CardContent>
            {entriesQuery.isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-semibold">{summary.totalHours.toFixed(1)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Running timers</CardTitle>
          </CardHeader>
          <CardContent>
            {entriesQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{summary.running}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top contributor</CardTitle>
          </CardHeader>
          <CardContent>
            {entriesQuery.isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : topUser ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={topUser.user?.avatar_url ?? undefined} />
                  <AvatarFallback>{(topUser.user?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-tight">{topUser.user?.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{(topUser.minutes / 60).toFixed(1)} hours logged</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No entries recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Time by teammate</CardTitle>
          <CardDescription>Aggregate hours and latest activity per contributor.</CardDescription>
        </CardHeader>
        <CardContent>
          {entriesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No time entries for this project yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teammate</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>Last update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(entry => (
                  <TableRow key={entry.user?.id ?? entry.entries}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.user?.avatar_url ?? undefined} />
                          <AvatarFallback>{(entry.user?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{entry.user?.full_name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{entry.user?.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{(entry.minutes / 60).toFixed(1)}</TableCell>
                    <TableCell>{entry.entries}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.lastEntry ? formatDistanceToNow(parseISO(entry.lastEntry), { addSuffix: true }) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Recent logs</CardTitle>
          <CardDescription>Latest captured entries grouped by day.</CardDescription>
        </CardHeader>
        <CardContent>
          {entriesQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : timesheet.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded time entries.</p>
          ) : (
            <ScrollArea className="max-h-[360px]">
              <div className="space-y-4 pr-4">
                {timesheet.map(day => (
                  <div key={day.label} className="space-y-2">
                    <p className="text-sm font-semibold">{day.label}</p>
                    <div className="space-y-2">
                      {day.logs.map(entry => (
                        <div key={entry.id} className="rounded-md border bg-muted/20 p-3">
                          <div className="flex flex-wrap items-center justify-between text-sm">
                            <span>{entry.tasks?.title ?? "Untitled task"}</span>
                            <span>{minutesLabel(entry.duration_minutes, entry.started_at, entry.ended_at)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Logged by {entry.user?.full_name ?? "Unknown"} · Started {format(parseISO(entry.started_at), "p")}
                          </p>
                          {entry.description ? (
                            <p className="text-xs text-muted-foreground">{entry.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function minutesBetween(startIso: string, endIso: string) {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  } catch {
    return 0;
  }
}

function minutesLabel(duration: number | null, start: string, end: string | null) {
  const minutes = duration ?? (end ? minutesBetween(start, end) : 0);
  return `${(minutes / 60).toFixed(1)}h`;
}
