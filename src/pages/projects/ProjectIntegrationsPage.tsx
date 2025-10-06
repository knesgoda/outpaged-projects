import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseError } from "@/services/utils";
import type { Webhook } from "@/types";
import {
  CheckCircle2,
  Github,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Slack,
  Trash2,
  Upload,
} from "lucide-react";
import { IntegrationStatus, WebhookRow } from "@/pages/integrations/IntegrationsPage";

type ProjectSummary = {
  id: string;
  name: string | null;
};

async function fetchProject(projectId: string): Promise<ProjectSummary | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load project.");
  }

  return (data as ProjectSummary | null) ?? null;
}

export default function ProjectIntegrationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const resolvedProjectId = projectId ?? "";
  const { toast } = useToast();

  const projectQuery = useQuery({
    queryKey: ["project", resolvedProjectId],
    queryFn: () => fetchProject(resolvedProjectId),
    enabled: Boolean(resolvedProjectId),
    staleTime: 1000 * 60 * 5,
  });

  const projectName = projectQuery.data?.name ?? resolvedProjectId;
  useDocumentTitle(`Projects / ${projectName} / Integrations`);

  const {
    userIntegrations,
    workspaceWebhooks,
    projectWebhooks,
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
  } = useIntegrations({ projectId: resolvedProjectId });

  const workspaceSlack = useMemo(
    () => userIntegrations.find((item) => item.provider === "slack" && !item.project_id) ?? null,
    [userIntegrations]
  );
  const projectSlack = useMemo(
    () => userIntegrations.find((item) => item.provider === "slack" && item.project_id === resolvedProjectId) ?? null,
    [userIntegrations, resolvedProjectId]
  );
  const workspaceGithub = useMemo(
    () => userIntegrations.find((item) => item.provider === "github" && !item.project_id) ?? null,
    [userIntegrations]
  );
  const projectGithub = useMemo(
    () => userIntegrations.find((item) => item.provider === "github" && item.project_id === resolvedProjectId) ?? null,
    [userIntegrations, resolvedProjectId]
  );
  const workspaceDrive = useMemo(
    () => userIntegrations.find((item) => item.provider === "google_drive" && !item.project_id) ?? null,
    [userIntegrations]
  );
  const projectDrive = useMemo(
    () => userIntegrations.find((item) => item.provider === "google_drive" && item.project_id === resolvedProjectId) ?? null,
    [userIntegrations, resolvedProjectId]
  );

  const [projectSlackChannel, setProjectSlackChannel] = useState("");
  const [projectGithubRepo, setProjectGithubRepo] = useState("");
  const [projectGithubEvents, setProjectGithubEvents] = useState({ issues: true, pull_requests: true });
  const [projectDriveFolder, setProjectDriveFolder] = useState("");

  useEffect(() => {
    setProjectSlackChannel(projectSlack?.display_name ?? projectSlack?.access_data?.channel ?? "");
  }, [projectSlack?.display_name, projectSlack?.access_data]);

  useEffect(() => {
    setProjectGithubRepo(projectGithub?.access_data?.repo ?? "");
    setProjectGithubEvents({
      issues: projectGithub?.access_data?.events?.includes("issues") ?? true,
      pull_requests: projectGithub?.access_data?.events?.includes("pull_requests") ?? true,
    });
  }, [projectGithub?.access_data]);

  useEffect(() => {
    setProjectDriveFolder(projectDrive?.access_data?.folder_id ?? "");
  }, [projectDrive?.access_data]);

  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets((current) => ({ ...current, [id]: !current[id] }));
  };

  if (!resolvedProjectId) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Missing project</AlertTitle>
        <AlertDescription>Project ID is required to manage integrations.</AlertDescription>
      </Alert>
    );
  }

  if (projectQuery.isError) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Unable to load project</AlertTitle>
        <AlertDescription>{(projectQuery.error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!projectQuery.isLoading && projectQuery.data === null) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>This project could not be located.</AlertDescription>
      </Alert>
    );
  }

  const handleProjectSlackSave = async () => {
    if (!projectSlackChannel.trim()) {
      toast({ title: "Channel required", description: "Enter a Slack channel.", variant: "destructive" });
      return;
    }

    try {
      if (projectSlack) {
        await updateUserIntegration(projectSlack.id, {
          display_name: projectSlackChannel.trim(),
          access_data: { channel: projectSlackChannel.trim() },
        });
        toast({ title: "Slack updated", description: "Project channel saved." });
      } else {
        await connectIntegration({
          provider: "slack",
          projectId: resolvedProjectId,
          displayName: projectSlackChannel.trim(),
          accessData: { channel: projectSlackChannel.trim() },
        });
        toast({ title: "Slack connected", description: "Project notifications ready." });
      }
    } catch (err: any) {
      toast({ title: "Slack error", description: err?.message ?? "Unable to update Slack.", variant: "destructive" });
    }
  };

  const handleProjectSlackTest = () => {
    console.info("TODO: Send project Slack test notification to", projectSlackChannel);
    toast({ title: "Test queued", description: "Slack test logged to console." });
  };

  const handleProjectGithubSave = async () => {
    if (!/^[^/\s]+\/[^/\s]+$/.test(projectGithubRepo.trim())) {
      toast({
        title: "Invalid repository",
        description: "Use the owner/name format.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (projectGithub) {
        await updateUserIntegration(projectGithub.id, {
          access_data: {
            repo: projectGithubRepo.trim(),
            events: [
              ...(projectGithubEvents.issues ? ["issues"] : []),
              ...(projectGithubEvents.pull_requests ? ["pull_requests"] : []),
            ],
          },
        });
        toast({ title: "GitHub updated", description: "Project subscription saved." });
      } else {
        await connectIntegration({
          provider: "github",
          projectId: resolvedProjectId,
          accessData: {
            repo: projectGithubRepo.trim(),
            events: [
              ...(projectGithubEvents.issues ? ["issues"] : []),
              ...(projectGithubEvents.pull_requests ? ["pull_requests"] : []),
            ],
          },
        });
        toast({ title: "GitHub connected", description: "Repository linked for this project." });
      }
    } catch (err: any) {
      toast({ title: "GitHub error", description: err?.message ?? "Unable to update GitHub.", variant: "destructive" });
    }
  };

  const handleProjectGithubTest = () => {
    console.info("TODO: Trigger project GitHub test for", projectGithubRepo, projectGithubEvents);
    toast({ title: "Test queued", description: "GitHub test logged to console." });
  };

  const handleProjectDriveSave = async () => {
    if (!projectDriveFolder.trim()) {
      toast({ title: "Folder required", description: "Enter a Google Drive folder ID.", variant: "destructive" });
      return;
    }

    try {
      if (projectDrive) {
        await updateUserIntegration(projectDrive.id, {
          access_data: { folder_id: projectDriveFolder.trim() },
        });
        toast({ title: "Google Drive updated", description: "Project folder saved." });
      } else {
        await connectIntegration({
          provider: "google_drive",
          projectId: resolvedProjectId,
          accessData: { folder_id: projectDriveFolder.trim() },
        });
        toast({ title: "Google Drive connected", description: "Drive folder linked." });
      }
    } catch (err: any) {
      toast({ title: "Google Drive error", description: err?.message ?? "Unable to update Google Drive.", variant: "destructive" });
    }
  };

  const handleProjectDriveTest = () => {
    console.info("TODO: Fetch Google Drive preview for project folder", projectDriveFolder);
    toast({ title: "Test queued", description: "Drive test logged to console." });
  };

  const handleProjectWebhookCreate = async () => {
    if (!newWebhookUrl.trim()) {
      toast({ title: "URL required", description: "Enter a target URL.", variant: "destructive" });
      return;
    }

    try {
      await createWebhook({ projectId: resolvedProjectId, targetUrl: newWebhookUrl.trim(), secret: newWebhookSecret.trim() });
      setNewWebhookUrl("");
      setNewWebhookSecret("");
      toast({ title: "Webhook created", description: "Project webhook added." });
    } catch (err: any) {
      toast({ title: "Webhook error", description: err?.message ?? "Unable to create webhook.", variant: "destructive" });
    }
  };

  const breadcrumbs = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/projects">Projects</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={`/projects/${resolvedProjectId}/overview`}>
              {projectQuery.data?.name ?? resolvedProjectId}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Integrations</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

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
          {breadcrumbs}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Configure Slack, GitHub, Google Drive, and webhooks for this project. Workspace defaults are shown for context.
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
              ? "You do not have permission to manage integrations in this project."
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
                Workspace default channel shows broadcasts. Add a project-specific channel if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Workspace channel</p>
                <p className="text-muted-foreground">
                  {workspaceSlack?.display_name || workspaceSlack?.access_data?.channel || "Not connected"}
                </p>
                <IntegrationStatus connected={Boolean(workspaceSlack)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-slack-channel">Project channel</Label>
                <Input
                  id="project-slack-channel"
                  placeholder="#team-build"
                  value={projectSlackChannel}
                  onChange={(event) => setProjectSlackChannel(event.target.value)}
                  disabled={isConnecting || isUpdatingIntegration}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleProjectSlackSave} disabled={isConnecting || isUpdatingIntegration}>
                  <Upload className="mr-2 h-4 w-4" />
                  {projectSlack ? "Save" : "Connect"}
                </Button>
                {projectSlack ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectIntegration(projectSlack.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={handleProjectSlackTest}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test message
                </Button>
              </div>
              <IntegrationStatus connected={Boolean(projectSlack)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-primary" />
                <CardTitle>GitHub</CardTitle>
              </div>
              <CardDescription>
                Workspace default repository: {workspaceGithub?.access_data?.repo || "Not connected"}. Add project overrides as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-github-repo">Repository (owner/name)</Label>
                <Input
                  id="project-github-repo"
                  placeholder="outpaged/mobile-app"
                  value={projectGithubRepo}
                  onChange={(event) => setProjectGithubRepo(event.target.value)}
                  disabled={isConnecting || isUpdatingIntegration}
                />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="project-github-issues"
                      checked={projectGithubEvents.issues}
                      onCheckedChange={(checked) =>
                        setProjectGithubEvents((state) => ({ ...state, issues: checked }))
                      }
                    />
                    <Label htmlFor="project-github-issues" className="font-normal">
                      Issues
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="project-github-prs"
                      checked={projectGithubEvents.pull_requests}
                      onCheckedChange={(checked) =>
                        setProjectGithubEvents((state) => ({ ...state, pull_requests: checked }))
                      }
                    />
                    <Label htmlFor="project-github-prs" className="font-normal">
                      Pull requests
                    </Label>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleProjectGithubSave} disabled={isConnecting || isUpdatingIntegration}>
                  <Upload className="mr-2 h-4 w-4" />
                  {projectGithub ? "Save" : "Connect"}
                </Button>
                {projectGithub ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectIntegration(projectGithub.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={handleProjectGithubTest}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test sync
                </Button>
              </div>
              <IntegrationStatus connected={Boolean(projectGithub)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <CardTitle>Google Drive</CardTitle>
              </div>
              <CardDescription>
                Workspace folder: {workspaceDrive?.access_data?.folder_id || "Not linked"}. Add project folder for scoped docs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-drive-folder">Project folder ID</Label>
                <Input
                  id="project-drive-folder"
                  placeholder="0BxxExampleId"
                  value={projectDriveFolder}
                  onChange={(event) => setProjectDriveFolder(event.target.value)}
                  disabled={isConnecting || isUpdatingIntegration}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleProjectDriveSave} disabled={isConnecting || isUpdatingIntegration}>
                  <Upload className="mr-2 h-4 w-4" />
                  {projectDrive ? "Save" : "Connect"}
                </Button>
                {projectDrive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => disconnectIntegration(projectDrive.id)}
                    disabled={isDisconnecting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={handleProjectDriveTest}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test fetch
                </Button>
              </div>
              <IntegrationStatus connected={Boolean(projectDrive)} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                <CardTitle>Webhooks</CardTitle>
              </div>
              <CardDescription>
                Workspace webhooks deliver global events. Add project webhooks for scoped automation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm font-medium">Workspace webhooks</p>
                {workspaceWebhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None configured.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {workspaceWebhooks.map((hook) => (
                      <li key={hook.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {hook.target_url}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
                <Input
                  placeholder="https://example.com/project-webhook"
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
                <Button onClick={handleProjectWebhookCreate} disabled={isSavingWebhook}>
                  <Upload className="mr-2 h-4 w-4" /> Create
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                {projectWebhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No project webhooks yet.</p>
                ) : (
                  projectWebhooks.map((webhook) => (
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
