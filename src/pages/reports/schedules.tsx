import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { ScheduledReport } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";

const SCHEDULE_QUERY_KEY = ["analytics", "schedules"];

export default function ReportSchedules() {
  const { scheduleReport, listSchedules, deleteSchedule } = useAnalytics();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; type: "run" | "delete" } | null>(null);

  const schedulesQuery = useQuery({
    queryKey: SCHEDULE_QUERY_KEY,
    queryFn: async () => listSchedules(),
  });

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);

  const scheduleMutation = useMutation({
    mutationFn: async (schedule: ScheduledReport) => scheduleReport(schedule),
    onMutate: async (schedule) => {
      setActionError(null);
      setPendingAction({ id: schedule.id, type: "run" });
      await queryClient.cancelQueries({ queryKey: SCHEDULE_QUERY_KEY });
      const previous = queryClient.getQueryData<ScheduledReport[]>(SCHEDULE_QUERY_KEY) ?? [];
      queryClient.setQueryData<ScheduledReport[]>(SCHEDULE_QUERY_KEY, (current = []) => {
        const filtered = current.filter((item) => item.id !== schedule.id);
        return [...filtered, schedule];
      });
      return { previous };
    },
    onError: (error, _schedule, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SCHEDULE_QUERY_KEY, context.previous);
      }
      const message = error instanceof Error ? error.message : "Failed to update schedule";
      setActionError(message);
    },
    onSuccess: () => {
      toast({ title: "Schedule updated" });
    },
    onSettled: () => {
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scheduleId: string) => deleteSchedule(scheduleId),
    onMutate: async (scheduleId) => {
      setActionError(null);
      setPendingAction({ id: scheduleId, type: "delete" });
      await queryClient.cancelQueries({ queryKey: SCHEDULE_QUERY_KEY });
      const previous = queryClient.getQueryData<ScheduledReport[]>(SCHEDULE_QUERY_KEY) ?? [];
      queryClient.setQueryData<ScheduledReport[]>(SCHEDULE_QUERY_KEY, (current = []) =>
        current.filter((item) => item.id !== scheduleId),
      );
      return { previous };
    },
    onError: (error, _scheduleId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SCHEDULE_QUERY_KEY, context.previous);
      }
      const message = error instanceof Error ? error.message : "Failed to delete schedule";
      setActionError(message);
    },
    onSuccess: () => {
      toast({ title: "Schedule deleted" });
    },
    onSettled: () => {
      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY });
    },
  });

  const handleRunNow = async (schedule: ScheduledReport) => {
    scheduleMutation.mutate(schedule);
  };

  const handleDelete = async (schedule: ScheduledReport) => {
    deleteMutation.mutate(schedule.id);
  };

  const loading = schedulesQuery.isLoading;
  const fetchError = schedulesQuery.error as Error | null | undefined;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Report Automations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage the cadence, recipients, and channels for every report distribution.
            </p>
          </div>
          <Button>Create schedule</Button>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {(fetchError || actionError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {actionError ?? fetchError?.message ?? "An unexpected error occurred"}
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 py-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading schedules…
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && schedules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No schedules yet. Create one to automate your reports.
                  </TableCell>
                </TableRow>
              )}
              {schedules.map((schedule) => {
                const isRowPending = pendingAction?.id === schedule.id;
                const runPending = isRowPending && pendingAction?.type === "run" && scheduleMutation.isPending;
                const deletePending =
                  isRowPending && pendingAction?.type === "delete" && deleteMutation.isPending;

                return (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.id}</TableCell>
                    <TableCell>{schedule.reportId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.cron}</Badge>
                    </TableCell>
                  <TableCell>
                    <Badge>{schedule.channel}</Badge>
                  </TableCell>
                  <TableCell>{schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : "—"}</TableCell>
                  <TableCell>{schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : "—"}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRunNow(schedule)}
                      disabled={runPending || deletePending}
                    >
                      {runPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Run now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(schedule)}
                      disabled={runPending || deletePending}
                    >
                      {deletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete
                    </Button>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
