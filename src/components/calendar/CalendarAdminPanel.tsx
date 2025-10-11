import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  CalendarDefaultSettings,
  CalendarDocumentationEntry,
  CalendarGovernanceSettings,
} from "@/types/calendar";
import { type CalendarView } from "@/components/common/ViewSwitch";

interface CalendarAdminPanelProps {
  defaults: CalendarDefaultSettings;
  onUpdateDefault: <K extends keyof CalendarDefaultSettings>(key: K, value: CalendarDefaultSettings[K]) => void;
  onResetDefaults: () => void;
  governance: CalendarGovernanceSettings;
  onUpdateGovernance: <K extends keyof CalendarGovernanceSettings>(
    key: K,
    value: CalendarGovernanceSettings[K]
  ) => void;
  documentation: CalendarDocumentationEntry[];
}

const VIEW_OPTIONS: CalendarView[] = [
  "day",
  "work-week",
  "week",
  "month",
  "quarter",
  "year",
  "timeline",
  "agenda",
];

const RESIDENCY_OPTIONS = [
  { id: "us-east", label: "US East" },
  { id: "eu-central", label: "EU Central" },
  { id: "apac", label: "APAC" },
];

export function CalendarAdminPanel({
  defaults,
  onUpdateDefault,
  onResetDefaults,
  governance,
  onUpdateGovernance,
  documentation,
}: CalendarAdminPanelProps) {
  return (
    <Card aria-label="Calendar defaults and governance">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Defaults & governance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Defaults</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span>Default view</span>
              <Select
                value={defaults.defaultView}
                onValueChange={(value) => onUpdateDefault("defaultView", value as CalendarDefaultSettings["defaultView"])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span>Snap minutes</span>
              <Select
                value={String(defaults.snapMinutes)}
                onValueChange={(value) => onUpdateDefault("snapMinutes", Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 15, 30].map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span>Default reminder</span>
              <Select
                value={String(defaults.defaultReminderMinutes)}
                onValueChange={(value) => onUpdateDefault("defaultReminderMinutes", Number(value))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 30, 60].map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span>Max duration confirmation</span>
              <Select
                value={String(defaults.maxEventDurationHours)}
                onValueChange={(value) => onUpdateDefault("maxEventDurationHours", Number(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 8, 12].map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="ghost" onClick={onResetDefaults}>
              Reset defaults
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Governance</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Compliance exports</span>
              <Switch
                checked={governance.complianceExportsEnabled}
                onCheckedChange={(checked) => onUpdateGovernance("complianceExportsEnabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Encryption at rest</span>
              <Switch
                checked={governance.encryptionAtRest}
                onCheckedChange={(checked) => onUpdateGovernance("encryptionAtRest", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Data residency</span>
              <Select
                value={governance.dataResidency}
                onValueChange={(value) => onUpdateGovernance("dataResidency", value)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESIDENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Documentation</Label>
          <ul className="space-y-2">
            {documentation.map((entry) => (
              <li key={entry.id} className="rounded-md border bg-muted/30 p-2">
                <p className="font-medium text-foreground">{entry.title}</p>
                <p className="text-muted-foreground">{entry.description}</p>
                <Button size="sm" variant="link" className="px-0" asChild>
                  <a href={entry.href} target="_blank" rel="noreferrer">
                    Open guide
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
