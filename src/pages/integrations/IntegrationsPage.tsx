import { useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Webhook } from "@/types";
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  GitBranch,
  Github,
  Globe,
  Link as LinkIcon,
  Loader2,
  Network,
  RefreshCw,
  Slack,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";

import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  useDocumentTitle("Integrations");
  const { toast } = useToast();
  const {
    userIntegrations,
    workspaceWebhooks,
    isLoading,
    isRefreshing,
    error,
    connectIntegration,
    disconnectIntegration,
    updateUserIntegration,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    isConnecting,
    isDisconnecting,
    isUpdatingIntegration,
    isSavingWebhook,
    isDeletingWebhook,
  } = useIntegrations();

  const slackConnection = useMemo(
    () => userIntegrations.find((item) => item.provider === "slack" && !item.project_id) ?? null,
    [userIntegrations]
  );
  const githubConnection = useMemo(
    () => userIntegrations.find((item) => item.provider === "github" && !item.project_id) ?? null,
    [userIntegrations]
  );
  const driveConnection = useMemo(
    () => userIntegrations.find((item) => item.provider === "google_drive" && !item.project_id) ?? null,
    [userIntegrations]
  );

  const [slackChannel, setSlackChannel] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubEvents, setGithubEvents] = useState({ issues: true, pull_requests: true });
  const [driveFolder, setDriveFolder] = useState("");

  useEffect(() => {
    setSlackChannel(
      slackConnection?.display_name || slackConnection?.access_data?.channel || ""
    );
  }, [slackConnection?.display_name, slackConnection?.access_data]);

  useEffect(() => {
    setGithubRepo(githubConnection?.access_data?.repo || "");
    setGithubEvents({
      issues: githubConnection?.access_data?.events?.includes("issues") ?? true,
      pull_requests: githubConnection?.access_data?.events?.includes("pull_requests") ?? true,
    });
  }, [githubConnection?.access_data]);

  useEffect(() => {
    setDriveFolder(driveConnection?.access_data?.folder_id || "");
  }, [driveConnection?.access_data]);

  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets((current) => ({ ...current, [id]: !current[id] }));
  };

  const handleSlackSave = async () => {
    if (!slackChannel.trim()) {
      toast({ title: "Channel required", description: "Enter a Slack channel.", variant: "destructive" });
      return;
    }

    try {
      if (slackConnection) {
        await updateUserIntegration(slackConnection.id, {
          display_name: slackChannel.trim(),
          access_data: { channel: slackChannel.trim() },
        });
        toast({ title: "Slack updated", description: "Default channel saved." });
      } else {
        await connectIntegration({
          provider: "slack",
          displayName: slackChannel.trim(),
          accessData: { channel: slackChannel.trim() },
        });
        toast({ title: "Slack connected", description: "Workspace notifications are ready." });
      }
    } catch (err: any) {
      toast({
        title: "Slack error",
        description: err?.message ?? "Unable to update Slack settings.",
        variant: "destructive",
      });
    }
  };

  const handleSlackTest = () => {
    console.info("TODO: Send Slack test notification to", slackChannel);
    toast({ title: "Test sent", description: "Slack test queued in console." });
  };

  const handleGithubSave = async () => {
    if (!/^[^/\s]+\/[^/\s]+$/.test(githubRepo.trim())) {
      toast({
        title: "Invalid repository",
        description: "Use the owner/name format.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (githubConnection) {
        await updateUserIntegration(githubConnection.id, {
          access_data: {
            repo: githubRepo.trim(),
            events: [
              ...(githubEvents.issues ? ["issues"] : []),
              ...(githubEvents.pull_requests ? ["pull_requests"] : []),
            ],
          },
        });
        toast({ title: "GitHub updated", description: "Subscription saved." });
      } else {
        await connectIntegration({
          provider: "github",
          accessData: {
            repo: githubRepo.trim(),
            events: [
              ...(githubEvents.issues ? ["issues"] : []),
              ...(githubEvents.pull_requests ? ["pull_requests"] : []),
            ],
          },
        });
        toast({ title: "GitHub connected", description: "Repository linked." });
      }
    } catch (err: any) {
      toast({
        title: "GitHub error",
        description: err?.message ?? "Unable to update GitHub settings.",
        variant: "destructive",
      });
    }
  };

  const handleGithubTest = () => {
    console.info("TODO: Trigger GitHub test sync for", githubRepo, githubEvents);
    toast({ title: "Test triggered", description: "GitHub test logged to console." });
  };

  const handleDriveSave = async () => {
    if (!driveFolder.trim()) {
      toast({ title: "Folder required", description: "Enter a Google Drive folder ID.", variant: "destructive" });
      return;
    }

    try {
      if (driveConnection) {
        await updateUserIntegration(driveConnection.id, {
          access_data: { folder_id: driveFolder.trim() },
        });
        toast({ title: "Google Drive updated", description: "Default folder saved." });
      } else {
        await connectIntegration({
          provider: "google_drive",
          accessData: { folder_id: driveFolder.trim() },
        });
        toast({ title: "Google Drive connected", description: "Folder linked." });
      }
    } catch (err: any) {
      toast({
        title: "Google Drive error",
        description: err?.message ?? "Unable to update Google Drive settings.",
        variant: "destructive",
      });
    }
  };

  const handleDriveTest = () => {
    console.info("TODO: Fetch Google Drive folder preview for", driveFolder);
    toast({ title: "Test scheduled", description: "Drive test logged to console." });
  };

  const handleWebhookCreate = async () => {
    if (!newWebhookUrl.trim()) {
      toast({ title: "URL required", description: "Enter a target URL.", variant: "destructive" });
      return;
    }

    try {
      await createWebhook({ targetUrl: newWebhookUrl.trim(), secret: newWebhookSecret.trim() });
      setNewWebhookUrl("");
      setNewWebhookSecret("");
      toast({ title: "Webhook created", description: "We will start sending events soon." });
    } catch (err: any) {
      toast({ title: "Webhook error", description: err?.message ?? "Unable to create webhook.", variant: "destructive" });
    }
  };

  const loadingPlaceholder = (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-dashed">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-24" />
          </CardContent>
        </Card>
      ))}
      <Card className="lg:col-span-2 border-dashed">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Integrations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect Slack, GitHub, Google Drive, and webhooks to automate your workspace.
            </p>
          </div>
        </div>
        {isRefreshing ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Syncing
          </span>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Access limited</AlertTitle>
          <AlertDescription>
            {error.message.includes("access")
              ? "You do not have permission to manage integrations."
              : error.message}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        loadingPlaceholder
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Slack className="h-5 w-5 text-primary" />
                <CardTitle>Slack</CardTitle>
              </div>
              <CardDescription>
                Post task updates to a default channel. TODO: replace with Slack App OAuth.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slack-channel">Default channel</Label>
                <Input
                  id="slack-channel"
                  placeholder="#launch-announcements"
                  value={slackChannel}
                  onChange={(event) => setSlackChannel(event.target.value)}
                  disabled={isConnecting || isDisconnecting || isUpdatingIntegration}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleSlackSave} disabled={isConnecting || isUpdatingIntegration}>
                  <Upload className="mr-2 h-4 w-4" />
                  {slackConnection ? "Save" : "Connect"}
                </Button>
                {slackConnection ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectIntegration(slackConnection.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={handleSlackTest}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test message
                </Button>
              </div>
              <IntegrationStatus connected={Boolean(slackConnection)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-primary" />
                <CardTitle>GitHub</CardTitle>
              </div>
              <CardDescription>
                Link a repository to sync pull requests and issues. TODO: GitHub App install flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-repo">Repository (owner/name)</Label>
                <Input
                  id="github-repo"
                  placeholder="outpaged/product"
                  value={githubRepo}
                  onChange={(event) => setGithubRepo(event.target.value)}
                  disabled={isConnecting || isUpdatingIntegration}
                />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="github-issues"
                      checked={githubEvents.issues}
                      onCheckedChange={(checked) =>
                        setGithubEvents((state) => ({ ...state, issues: checked }))
                      }
                    />
                    <Label htmlFor="github-issues" className="font-normal">
                      Issues
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="github-prs"
                      checked={githubEvents.pull_requests}
                      onCheckedChange={(checked) =>
                        setGithubEvents((state) => ({ ...state, pull_requests: checked }))
                      }
                    />
                    <Label htmlFor="github-prs" className="font-normal">
                      Pull requests
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleGithubSave} disabled={isConnecting || isUpdatingIntegration}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  {githubConnection ? "Save" : "Connect"}
                </Button>
                {githubConnection ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectIntegration(githubConnection.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={handleGithubTest}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test sync
                </Button>
              </div>
              <IntegrationStatus connected={Boolean(githubConnection)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                <CardTitle>Google Drive</CardTitle>
              </div>
              <CardDescription>
                Attach documents from Drive. TODO: real OAuth with Drive scopes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="drive-folder">Shared folder ID</Label>
                <Input
                  id="drive-folder"
                  placeholder="0BxxExampleId"
                  value={driveFolder}
                  onChange={(event) => setDriveFolder(event.target.value)}
                  disabled={isConnecting || isUpdatingIntegration}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleDriveSave} disabled={isConnecting || isUpdatingIntegration}>
                  <Upload className="mr-2 h-4 w-4" />
                  {driveConnection ? "Save" : "Connect"}
                </Button>
                {driveConnection ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectIntegration(driveConnection.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={handleDriveTest}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test fetch
                </Button>
              </div>
              <IntegrationStatus connected={Boolean(driveConnection)} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <CardTitle>Webhooks</CardTitle>
              </div>
              <CardDescription>
                Trigger outbound HTTP requests when work changes. TODO: background delivery + retries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <Input
                  placeholder="https://example.com/webhooks/outpaged"
                  value={newWebhookUrl}
                  onChange={(event) => setNewWebhookUrl(event.target.value)}
                  disabled={isSavingWebhook}
                />
                <Input
                  placeholder="Optional secret"
                  value={newWebhookSecret}
                  onChange={(event) => setNewWebhookSecret(event.target.value)}
                  disabled={isSavingWebhook}
                />
                <Button onClick={handleWebhookCreate} disabled={isSavingWebhook}>
                  <Upload className="mr-2 h-4 w-4" /> Create
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                {workspaceWebhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No webhooks yet. Create one to stream updates to your systems.
                  </p>
                ) : (
                  workspaceWebhooks.map((webhook) => (
                    <WebhookRow
                      key={webhook.id}
                      webhook={webhook}
                      onSave={(patch) => updateWebhook(webhook.id, patch)}
                      onDelete={() => deleteWebhook(webhook.id)}
                      onToggleSecret={() => toggleSecretVisibility(webhook.id)}
                      secretVisible={Boolean(visibleSecrets[webhook.id])}
                      isUpdating={isSavingWebhook}
                      isDeleting={isDeletingWebhook}
                    />
                  ))
                )}
                <p className="text-xs text-muted-foreground">
                  Recent pings will appear here once the delivery queue is wired up.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

type IntegrationStatusProps = {
  connected: boolean;
};

export function IntegrationStatus({ connected }: IntegrationStatusProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm", connected ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground") }>
      {connected ? <CheckCircle2 className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
      {connected ? "Connected" : "Not connected"}
    </div>
  );
}

export type WebhookRowProps = {
  webhook: Webhook;
  onSave: (patch: Partial<Pick<Webhook, "target_url" | "secret" | "active">>) => Promise<any>;
  onDelete: () => Promise<any>;
  onToggleSecret: () => void;
  secretVisible: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};

export function WebhookRow({
  webhook,
  onSave,
  onDelete,
  onToggleSecret,
  secretVisible,
  isUpdating,
  isDeleting,
}: WebhookRowProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState(webhook.target_url);
  const [secret, setSecret] = useState(webhook.secret ?? "");
  const [active, setActive] = useState(webhook.active);
  const [isDirty, setDirty] = useState(false);

  const isProjectScoped = Boolean(webhook.project_id);
  const scopeLabel = isProjectScoped ? "Project" : "Workspace";
  const ScopeIcon = isProjectScoped ? Workflow : Globe;

  useEffect(() => {
    setUrl(webhook.target_url);
    setSecret(webhook.secret ?? "");
    setActive(webhook.active);
    setDirty(false);
  }, [webhook.target_url, webhook.secret, webhook.active]);

  const handleSave = async () => {
    try {
      await onSave({ target_url: url, secret, active });
      toast({ title: "Webhook updated", description: "Changes saved." });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Webhook error", description: err?.message ?? "Unable to update webhook.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this webhook?")) {
      return;
    }
    try {
      await onDelete();
      toast({ title: "Webhook deleted", description: "Delivery disabled." });
    } catch (err: any) {
      toast({ title: "Webhook error", description: err?.message ?? "Unable to delete webhook.", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 space-y-2">
          <Label htmlFor={`webhook-url-${webhook.id}`} className="text-xs uppercase text-muted-foreground">
            Target URL
          </Label>
          <Input
            id={`webhook-url-${webhook.id}`}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setDirty(true);
            }}
            disabled={isUpdating}
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="space-y-1">
              <Label htmlFor={`webhook-secret-${webhook.id}`} className="text-xs uppercase text-muted-foreground">
                Secret
              </Label>
              <Input
                id={`webhook-secret-${webhook.id}`}
                value={secretVisible ? secret : secret ? "•".repeat(Math.min(secret.length, 12)) : ""}
                onChange={(event) => {
                  setSecret(event.target.value);
                  setDirty(true);
                }}
                disabled={isUpdating}
                type={secretVisible ? "text" : "password"}
                placeholder="Optional"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-6"
              onClick={onToggleSecret}
            >
              {secretVisible ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" /> Hide
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" /> Show
                </>
              )}
            </Button>
            <div className="mt-6 flex items-center gap-2">
              <Switch
                id={`webhook-active-${webhook.id}`}
                checked={active}
                onCheckedChange={(checked) => {
                  setActive(checked);
                  setDirty(true);
                }}
                disabled={isUpdating}
              />
              <Label htmlFor={`webhook-active-${webhook.id}`} className="text-sm">
                Active
              </Label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <Badge variant={isProjectScoped ? "default" : "secondary"} className="gap-1">
              <ScopeIcon className="h-3 w-3" /> {scopeLabel}
            </Badge>
            <Badge variant="outline">Created {new Date(webhook.created_at).toLocaleDateString()}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isUpdating || !isDirty}
            >
              <Upload className="mr-2 h-4 w-4" /> Save
            </Button>
            <Button type="button" variant="outline" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
