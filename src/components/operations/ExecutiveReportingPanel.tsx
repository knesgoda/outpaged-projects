import { useState } from "react";
import { FileDown, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperations } from "./OperationsProvider";

export function ExecutiveReportingPanel() {
  const { digestSchedules, reports, scheduleDigest, recordReport } = useOperations();
  const [digestDraft, setDigestDraft] = useState({
    scope: "Portfolio A",
    cadence: "weekly" as "weekly" | "monthly",
    channel: "email" as "email" | "slack" | "both",
    recipients: "exec@example.com",
  });
  const [reportType, setReportType] = useState("roadmap");

  const handleScheduleDigest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    scheduleDigest({
      scope: digestDraft.scope,
      cadence: digestDraft.cadence,
      channel: digestDraft.channel,
      recipients: digestDraft.recipients.split(",").map((value) => value.trim()),
    });
    setDigestDraft({ scope: "Portfolio A", cadence: digestDraft.cadence, channel: digestDraft.channel, recipients: "" });
  };

  const handleGenerateReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordReport({ type: reportType as "roadmap" | "status" | "dependency", url: `/reports/${reportType}.pdf` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive reporting</CardTitle>
        <CardDescription>
          Automate digests and export PDF/PNG packs for leadership-ready updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleScheduleDigest} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>Scope</Label>
            <Input
              value={digestDraft.scope}
              onChange={(event) => setDigestDraft((prev) => ({ ...prev, scope: event.target.value }))}
              placeholder="Portfolio name"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Cadence</Label>
            <Select value={digestDraft.cadence} onValueChange={(value) => setDigestDraft((prev) => ({ ...prev, cadence: value as typeof prev.cadence }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Channel</Label>
            <Select value={digestDraft.channel} onValueChange={(value) => setDigestDraft((prev) => ({ ...prev, channel: value as typeof prev.channel }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="both">Email + Slack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-12 space-y-2">
            <Label>Recipients</Label>
            <Input
              value={digestDraft.recipients}
              onChange={(event) => setDigestDraft((prev) => ({ ...prev, recipients: event.target.value }))}
              placeholder="comma-separated emails"
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              <Send className="h-4 w-4 mr-2" /> Schedule digest
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {digestSchedules.length === 0 ? (
            <p className="text-muted-foreground">No digests scheduled.</p>
          ) : (
            digestSchedules.map((schedule) => (
              <Card key={schedule.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{schedule.scope}</CardTitle>
                  <CardDescription>
                    {schedule.cadence} via {schedule.channel} • Recipients {schedule.recipients.join(", ")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleGenerateReport} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>Report type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roadmap">Roadmap snapshot</SelectItem>
                <SelectItem value="status">Initiative status</SelectItem>
                <SelectItem value="dependency">Dependency risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-8 flex items-end justify-end">
            <Button type="submit">
              <FileDown className="h-4 w-4 mr-2" /> Generate export
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {reports.length === 0 ? (
            <p className="text-muted-foreground">No executive reports generated yet.</p>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{report.type.toUpperCase()} report</CardTitle>
                  <CardDescription>Generated {new Date(report.generatedAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  <a href={report.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {report.url}
                  </a>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
