import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { ScheduledReport } from "@/hooks/useAnalytics";

const MOCK_SCHEDULES: ScheduledReport[] = [
  {
    id: "weekly-health",
    reportId: "team-health",
    cron: "0 13 * * 1",
    recipients: ["analytics@example.com"],
    channel: "email",
    lastRunAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    nextRunAt: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
  },
];

export default function ReportSchedules() {
  const { scheduleReport } = useAnalytics();
  const schedules = useMemo(() => MOCK_SCHEDULES, []);

  const handleRunNow = async (schedule: ScheduledReport) => {
    await scheduleReport(schedule);
  };

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
              {schedules.map((schedule) => (
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
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleRunNow(schedule)}>
                      Run now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
