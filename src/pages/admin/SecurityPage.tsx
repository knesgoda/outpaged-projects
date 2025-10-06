import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateWorkspaceSettings, useWorkspaceSettings } from "@/hooks/useWorkspace";
import { useRecordAudit } from "@/hooks/useAudit";

const DEFAULT_SECURITY = {
  mfa_required: false,
  session_hours: 72,
  data_retention_days: 365,
};

type SecurityState = typeof DEFAULT_SECURITY;

export default function SecurityPage() {
  const { data: settings } = useWorkspaceSettings();
  const updateSettings = useUpdateWorkspaceSettings();
  const audit = useRecordAudit();
  const [security, setSecurity] = useState<SecurityState>(DEFAULT_SECURITY);

  useEffect(() => {
    if (!settings?.security || typeof settings.security !== "object") return;
    setSecurity({ ...DEFAULT_SECURITY, ...(settings.security as Partial<SecurityState>) });
  }, [settings]);

  const handleToggle = (key: keyof SecurityState) => (checked: boolean) => {
    setSecurity((prev) => ({ ...prev, [key]: checked }));
  };

  const handleChange = (key: "session_hours" | "data_retention_days") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setSecurity((prev) => ({ ...prev, [key]: Number.isFinite(value) ? value : prev[key] }));
    };

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({ security });
      audit.mutate({
        action: "workspace.security.update",
        metadata: security,
      });
    } catch (error) {
      console.warn("Failed to update security", error);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Security</h2>
        <p className="text-muted-foreground">Set guardrails for passwords, sessions, and data retention.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
          <CardDescription>Changes apply instantly to all members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require multi-factor</p>
              <p className="text-sm text-muted-foreground">Members must enroll an authenticator app.</p>
            </div>
            <Switch
              checked={security.mfa_required}
              onCheckedChange={handleToggle("mfa_required")}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Session timeout</p>
              <p className="text-sm text-muted-foreground">End inactive sessions after these hours.</p>
            </div>
            <Input
              type="number"
              min={24}
              max={168}
              value={security.session_hours}
              onChange={handleChange("session_hours")}
              className="w-32"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Data retention</p>
              <p className="text-sm text-muted-foreground">Remove archived audit data after these days.</p>
            </div>
            <Input
              type="number"
              min={30}
              max={1825}
              value={security.data_retention_days}
              onChange={handleChange("data_retention_days")}
              className="w-32"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving" : "Save security"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
