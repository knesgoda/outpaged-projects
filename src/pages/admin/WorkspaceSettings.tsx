import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogoUploader } from "@/components/admin/LogoUploader";
import {
  useUpdateWorkspaceSettings,
  useUploadBrandLogo,
  useWorkspaceSettings,
} from "@/hooks/useWorkspace";
import { useRecordAudit } from "@/hooks/useAudit";

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const FEATURE_FLAGS = [
  { key: "automations", label: "Automations" },
  { key: "dashboards", label: "Dashboards" },
  { key: "api", label: "API access" },
];

type FormState = {
  brand_name: string;
  name: string;
  default_timezone: string;
  default_capacity_hours_per_week: string;
  allowed_email_domain: string;
  features: Record<string, boolean>;
};

const DEFAULT_STATE: FormState = {
  brand_name: "",
  name: "",
  default_timezone: "UTC",
  default_capacity_hours_per_week: "40",
  allowed_email_domain: "",
  features: {},
};

export default function WorkspaceSettings() {
  const { data: settings, isLoading } = useWorkspaceSettings();
  const updateSettings = useUpdateWorkspaceSettings();
  const uploadLogo = useUploadBrandLogo();
  const audit = useRecordAudit();
  const [formState, setFormState] = useState<FormState>(DEFAULT_STATE);

  useEffect(() => {
    if (!settings) return;
    setFormState({
      brand_name: settings.brand_name ?? settings.name ?? "",
      name: settings.name ?? "",
      default_timezone: settings.default_timezone ?? "UTC",
      default_capacity_hours_per_week:
        settings.default_capacity_hours_per_week?.toString() ?? "40",
      allowed_email_domain: settings.allowed_email_domain ?? "",
      features: typeof settings.features === "object" && settings.features
        ? (settings.features as Record<string, boolean>)
        : {},
    });
  }, [settings]);

  const handleChange = (field: keyof Omit<FormState, "features">) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormState((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const toggleFeature = (key: string) => (checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      features: { ...prev.features, [key]: checked },
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      brand_name: formState.brand_name.trim() || null,
      name: formState.name.trim() || null,
      default_timezone: formState.default_timezone,
      default_capacity_hours_per_week: formState.default_capacity_hours_per_week
        ? Number(formState.default_capacity_hours_per_week)
        : null,
      allowed_email_domain: formState.allowed_email_domain.trim() || null,
      features: formState.features,
    };

    try {
      await updateSettings.mutateAsync(payload);
      audit.mutate({
        action: "workspace.update",
        metadata: {
          name: payload.name,
          default_timezone: payload.default_timezone,
          allowed_email_domain: payload.allowed_email_domain,
          features: payload.features,
        },
      });
    } catch (error) {
      console.warn("Failed to update workspace", error);
    }
  };

  const handleLogoUpload = (file: File) => {
    uploadLogo.mutate(file, {
      onSuccess: () => {
        audit.mutate({
          action: "workspace.logo.updated",
          metadata: { size: file.size, type: file.type },
        });
      },
    });
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Workspace</h2>
        <p className="text-muted-foreground">Update global workspace details and branding.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <LogoUploader
          logoUrl={settings?.brand_logo_url}
          uploading={uploadLogo.isPending}
          onUpload={handleLogoUpload}
        />

        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>These values appear in navigation and invite emails.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="brand_name">Brand name</Label>
              <Input
                id="brand_name"
                value={formState.brand_name}
                onChange={handleChange("brand_name")}
                placeholder="OutPaged"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                required
                value={formState.name}
                onChange={handleChange("name")}
                placeholder="Acme Operations"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Default timezone</Label>
              <select
                id="timezone"
                value={formState.default_timezone}
                onChange={handleChange("default_timezone")}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Default capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={80}
                value={formState.default_capacity_hours_per_week}
                onChange={handleChange("default_capacity_hours_per_week")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="domain">Allowed email domain</Label>
              <Input
                id="domain"
                value={formState.allowed_email_domain}
                onChange={handleChange("allowed_email_domain")}
                placeholder="example.com"
              />
              <Alert variant="warning" className="mt-2">
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>
                  Only teammates with this domain will be able to join when this is set.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Toggle modules for your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FEATURE_FLAGS.map((feature) => (
              <div key={feature.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">Controls access for the entire workspace.</p>
                </div>
                <Switch
                  checked={Boolean(formState.features[feature.key])}
                  onCheckedChange={toggleFeature(feature.key)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending || isLoading}>
            {updateSettings.isPending ? "Saving" : "Save workspace"}
          </Button>
        </div>
      </form>
    </section>
  );
}
