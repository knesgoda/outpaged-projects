import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { CalendarAutomationRule } from "@/types/calendar";

interface AutomationRulesPanelProps {
  rules: CalendarAutomationRule[];
  onToggle: (ruleId: string) => void;
}

const TRIGGER_LABEL: Record<CalendarAutomationRule["trigger"], string> = {
  "event-created": "When event created",
  "event-updated": "When event updated",
  "event-starting": "When event starting soon",
  "event-conflict": "When conflict detected",
  "external-sync": "When external sync completes",
};

const ACTION_LABEL: Record<CalendarAutomationRule["action"], string> = {
  "create-task": "Create linked task",
  "post-channel": "Post to channel",
  "add-to-sprint": "Add to sprint",
  "notify-owner": "Notify owner",
};

export function AutomationRulesPanel({ rules, onToggle }: AutomationRulesPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Automation rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {rules.length === 0 ? (
          <p className="text-muted-foreground">No automation configured.</p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-muted-foreground">{rule.description ?? `${TRIGGER_LABEL[rule.trigger]} → ${ACTION_LABEL[rule.action]}`}</p>
                  <div className="text-[11px] text-muted-foreground">
                    <span>{TRIGGER_LABEL[rule.trigger]}</span>
                    <span className="mx-1">→</span>
                    <span>{ACTION_LABEL[rule.action]}</span>
                  </div>
                </div>
                <Switch checked={rule.enabled} onCheckedChange={() => onToggle(rule.id)} />
              </div>
              {rule.config && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  {Object.entries(rule.config).map(([key, value]) => (
                    <span key={key} className="rounded-md bg-background px-2 py-1">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              )}
              {!rule.enabled && (
                <Button
                  size="sm"
                  variant="link"
                  className="px-0 text-[11px]"
                  onClick={() => onToggle(rule.id)}
                >
                  Enable rule
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
