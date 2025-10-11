import { useState } from "react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  CalendarConflictPreference,
  CalendarIntegration,
  CalendarIntegrationProvider,
} from "@/types/calendar";

interface IntegrationManagerProps {
  integrations: CalendarIntegration[];
  onConnect: (provider: CalendarIntegrationProvider, email: string) => Promise<void>;
  onDisconnect: (integrationId: string) => Promise<void>;
  onSync: (integrationId: string) => Promise<void>;
  onChangePreference: (integrationId: string, preference: CalendarConflictPreference) => Promise<void>;
}

const PROVIDER_LABEL: Record<CalendarIntegrationProvider, string> = {
  google: "Google Calendar",
  outlook: "Microsoft Outlook",
  apple: "Apple Calendar",
};

export function IntegrationManager({
  integrations,
  onConnect,
  onDisconnect,
  onSync,
  onChangePreference,
}: IntegrationManagerProps) {
  const [provider, setProvider] = useState<CalendarIntegrationProvider>("google");
  const [email, setEmail] = useState("avery@example.com");
  const [submitting, setSubmitting] = useState(false);

  const handleConnect = async () => {
    if (!email) return;
    setSubmitting(true);
    try {
      await onConnect(provider, email);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm">External calendar connections</CardTitle>
        <p className="text-xs text-muted-foreground">
          Manage OAuth connections and control which system wins during sync conflicts.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {integrations.length === 0 ? (
          <p className="text-muted-foreground">No integrations connected.</p>
        ) : (
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div key={integration.id} className="rounded-md border bg-muted/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{PROVIDER_LABEL[integration.provider]}</p>
                    <p className="text-muted-foreground">{integration.accountEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void onSync(integration.id)}
                      disabled={integration.status === "connecting"}
                    >
                      Sync now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void onDisconnect(integration.id)}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Conflict handling</Label>
                    <Select
                      value={integration.conflictPreference}
                      onValueChange={(value) =>
                        void onChangePreference(integration.id, value as CalendarConflictPreference)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="platform">Platform wins</SelectItem>
                        <SelectItem value="external">External wins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-muted-foreground">
                    <p>Status: {integration.status}</p>
                    {integration.lastSyncAt && (
                      <p>
                        Last sync {formatDistanceToNowStrict(parseISO(integration.lastSyncAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                {integration.syncError && (
                  <p className="mt-2 text-destructive">{integration.syncError}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 p-4 text-xs">
        <div className="grid w-full gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
          <div>
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="h-9"
            />
          </div>
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as CalendarIntegrationProvider)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Calendar</SelectItem>
                <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                <SelectItem value="apple">Apple Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleConnect} disabled={submitting} className="self-end">
          {submitting ? "Connecting…" : "Connect calendar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
