import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CalendarExportOptions } from "@/types/calendar";

interface CalendarExportPanelProps {
  onExport: (options: CalendarExportOptions) => void;
}

export function CalendarExportPanel({ onExport }: CalendarExportPanelProps) {
  const [includePrivate, setIncludePrivate] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [expandRecurrence, setExpandRecurrence] = useState(true);

  const triggerExport = (format: CalendarExportOptions["format"]) => {
    onExport({
      includePrivate,
      includeAttachments,
      expandRecurrence,
      format,
    });
  };

  return (
    <Card aria-label="Export calendar data">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Export & print</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="space-y-3">
          <Label className="text-xs uppercase text-muted-foreground">Options</Label>
          <div className="flex items-center justify-between">
            <span>Include private events</span>
            <Switch checked={includePrivate} onCheckedChange={setIncludePrivate} />
          </div>
          <div className="flex items-center justify-between">
            <span>Include attachments</span>
            <Switch checked={includeAttachments} onCheckedChange={setIncludeAttachments} />
          </div>
          <div className="flex items-center justify-between">
            <span>Expand recurrence</span>
            <Switch checked={expandRecurrence} onCheckedChange={setExpandRecurrence} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => triggerExport("ics")}>ICS</Button>
          <Button size="sm" variant="outline" onClick={() => triggerExport("csv")}>CSV</Button>
          <Button size="sm" variant="outline" onClick={() => triggerExport("pdf")}>PDF</Button>
          <Button size="sm" variant="ghost" onClick={() => window.print()}>
            Print view
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
