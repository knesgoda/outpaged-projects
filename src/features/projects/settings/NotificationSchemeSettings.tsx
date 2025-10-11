import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  getNotificationDigestSummary,
  getNotificationScheme,
  registerAutomationRun,
  updateDigestChannels,
  updateNotificationChannel,
  type NotificationChannel,
  type ProjectNotificationScheme,
} from "@/services/projects/projectNotificationService";

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  slack: "Slack",
  teams: "Teams",
  in_app: "In-app",
};

interface NotificationSchemeSettingsProps {
  projectId: string;
}

export function NotificationSchemeSettings({ projectId }: NotificationSchemeSettingsProps) {
  const [scheme, setScheme] = useState<ProjectNotificationScheme>(() => getNotificationScheme(projectId));
  const { toast } = useToast();

  const digestSummary = useMemo(() => getNotificationDigestSummary(projectId), [projectId, scheme.updatedAt]);

  const handleToggle = (triggerId: string, channel: NotificationChannel, enabled: boolean) => {
    const next = updateNotificationChannel(projectId, triggerId, channel, enabled);
    setScheme(next);
    toast({ description: `${CHANNEL_LABELS[channel]} ${enabled ? "enabled" : "disabled"} for ${triggerId}` });
  };

  const handleDigestChannelToggle = (digestId: string, channel: NotificationChannel, enabled: boolean) => {
    const digest = scheme.digests.find((entry) => entry.id === digestId);
    if (!digest) return;
    const channels = enabled
      ? Array.from(new Set([...digest.channels, channel]))
      : digest.channels.filter((item) => item !== channel);
    const next = updateDigestChannels(projectId, digestId, channels);
    setScheme(next);
    toast({ description: `${digest.name} updated` });
  };

  const handleSimulateAutomation = () => {
    registerAutomationRun(projectId, {
      name: "Ad-hoc data sync",
      cadence: "hourly",
      status: "running",
    });
    toast({ description: "Automation run scheduled" });
  };

  return (
    <Card id="notifications" className="border-border/70">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Notification delivery</CardTitle>
          <CardDescription>Control how project activity flows to your channels.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleSimulateAutomation}>
          Simulate automation run
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Triggers</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {scheme.triggers.map((trigger) => (
              <div key={trigger.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{trigger.label}</p>
                    {trigger.description ? (
                      <p className="text-xs text-muted-foreground">{trigger.description}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline">{trigger.trigger}</Badge>
                </div>
                <Separator className="my-3" />
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(["in_app", "email", "slack", "teams"] as NotificationChannel[]).map((channel) => {
                    const config = trigger.channels.find((entry) => entry.channel === channel);
                    const enabled = config?.enabled ?? false;
                    return (
                      <li key={channel} className="flex items-center justify-between gap-2">
                        <span>{CHANNEL_LABELS[channel]}</span>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(value) => handleToggle(trigger.id, channel, value)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Digests</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {scheme.digests.map((digest) => (
              <div key={digest.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{digest.name}</p>
                    <p className="text-xs text-muted-foreground">Cadence: {digest.cadence}</p>
                  </div>
                  <Badge variant="outline">{digest.sendAt}</Badge>
                </div>
                <Separator className="my-3" />
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {(["email", "slack", "teams"] as NotificationChannel[]).map((channel) => (
                    <li key={channel} className="flex items-center justify-between gap-2">
                      <span>{CHANNEL_LABELS[channel]}</span>
                      <Switch
                        checked={digest.channels.includes(channel)}
                        onCheckedChange={(value) => handleDigestChannelToggle(digest.id, channel, value)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent deliveries</h3>
          <ScrollArea className="mt-2 h-48 rounded-lg border border-border/60">
            <ul className="space-y-2 p-3 text-xs text-muted-foreground">
              {digestSummary.recentDeliveries.length === 0 ? (
                <li className="text-muted-foreground">No notifications delivered yet.</li>
              ) : (
                digestSummary.recentDeliveries.map((delivery) => (
                  <li key={delivery.id} className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{delivery.summary}</span>
                      <Badge variant="outline">{delivery.trigger}</Badge>
                    </div>
                    <p className="mt-1">Channels: {delivery.channels.join(", ")} • Recipients: {delivery.recipients.join(", ")}</p>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
