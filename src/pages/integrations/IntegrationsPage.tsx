import { useEffect, useMemo, useState } from "react";
import {
  Github,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Play,
  Plug,
  Trash2,
  Webhook as WebhookIcon,
  Folder,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useProjectList, useProjectSummary } from "@/hooks/useProjectsLite";
import {
  useConnectIntegrationMutation,
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useDisconnectIntegrationMutation,
  useIntegrationsCatalog,
  useUpdateIntegrationMutation,
  useUpdateWebhookMutation,
  useUserIntegrations,
  useWebhooks,
} from "@/hooks/useIntegrations";
import type { BreadcrumbLinkItem } from "@/state/breadcrumbs";
import { usePageMetadata } from "@/state/breadcrumbs";
import type { UserIntegration, Webhook } from "@/types";

const ALL_SCOPE = "all";
const WORKSPACE_SCOPE = "workspace";

const PROVIDER_LABELS: Record<UserIntegration["provider"], string> = {
  slack: "Slack",
  github: "GitHub",
  google_drive: "Google Drive",
};

type IntegrationsViewProps = {
  heading: string;
  description: string;
  breadcrumbs: BreadcrumbLinkItem[];
  documentTitle: string;
  enableProjectFilter?: boolean;
  fixedProjectId?: string;
};

type WebhookFormState = {
  id?: string;
  targetUrl: string;
  secret: string;
};

function groupConnections(
  connections: UserIntegration[],
  provider: UserIntegration["provider"],
  scope: string,
  projectId?: string | null
) {
  if (scope === ALL_SCOPE) {
    return connections.filter((item) => item.provider === provider);
  }

  return connections.filter((item) => {
    if (item.provider !== provider) return false;
    if (projectId === null) return item.project_id === null;
    return item.project_id === projectId;
  });
}

function projectLabel(projectId: string | null | undefined, projectLookup: Map<string, string>) {
  if (!projectId) {
    return "Workspace";
  }
  return projectLookup.get(projectId) ?? projectId.slice(0, 8);
}

function validateRepoFormat(value: string) {
  if (!value) {
    throw new Error("Enter a repository in owner/name format");
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(value.trim())) {
    throw new Error("Use the owner/name format");
  }
}

function IntegrationsView({
  heading,
  description,
  breadcrumbs,
  documentTitle,
  enableProjectFilter = false,
  fixedProjectId,
}: IntegrationsViewProps) {
  const { toast } = useToast();
  const { data: projects = [] } = useProjectList({ enabled: enableProjectFilter });
  const projectLookup = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project.name ?? "Untitled"]));
  }, [projects]);

  const [selectedScope, setSelectedScope] = useState(
    enableProjectFilter ? ALL_SCOPE : fixedProjectId ?? WORKSPACE_SCOPE
  );

  useEffect(() => {
    if (!enableProjectFilter && fixedProjectId) {
      setSelectedScope(fixedProjectId);
    }
  }, [enableProjectFilter, fixedProjectId]);

  const scopeProjectId = selectedScope === WORKSPACE_SCOPE
    ? null
    : selectedScope === ALL_SCOPE
    ? undefined
    : selectedScope;

  usePageMetadata({ breadcrumbs, title: heading, documentTitle });

  const integrationsCatalog = useIntegrationsCatalog();
  const userIntegrations = useUserIntegrations(
    selectedScope === ALL_SCOPE ? {} : { projectId: scopeProjectId ?? null }
  );
  const webhooks = useWebhooks(scopeProjectId);

  const connectIntegrationMutation = useConnectIntegrationMutation();
  const disconnectIntegrationMutation = useDisconnectIntegrationMutation();
  const updateIntegrationMutation = useUpdateIntegrationMutation();
  const createWebhookMutation = useCreateWebhookMutation(scopeProjectId);
  const updateWebhookMutation = useUpdateWebhookMutation(scopeProjectId);
  const deleteWebhookMutation = useDeleteWebhookMutation(scopeProjectId);

  const slackConnections = groupConnections(
    userIntegrations.data ?? [],
    "slack",
    selectedScope,
    scopeProjectId ?? null
  );
  const githubConnections = groupConnections(
    userIntegrations.data ?? [],
    "github",
    selectedScope,
    scopeProjectId ?? null
  );
  const driveConnections = groupConnections(
    userIntegrations.data ?? [],
    "google_drive",
    selectedScope,
    scopeProjectId ?? null
  );

  const slackConnection = selectedScope === ALL_SCOPE ? undefined : slackConnections[0];
  const githubConnection = selectedScope === ALL_SCOPE ? undefined : githubConnections[0];
  const driveConnection = selectedScope === ALL_SCOPE ? undefined : driveConnections[0];

  const [slackChannel, setSlackChannel] = useState("");
  const [slackDisplayName, setSlackDisplayName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubIssues, setGithubIssues] = useState(true);
  const [githubPrs, setGithubPrs] = useState(true);
  const [driveFolder, setDriveFolder] = useState("");
  const [webhookForm, setWebhookForm] = useState<WebhookFormState>({ targetUrl: "", secret: "" });
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSlackChannel((slackConnection?.access_data?.channel as string) ?? "");
    setSlackDisplayName(slackConnection?.display_name ?? "");
  }, [slackConnection]);

  useEffect(() => {
    setGithubRepo((githubConnection?.access_data?.repo as string) ?? "");
    setGithubIssues(Boolean(githubConnection?.access_data?.issues ?? true));
    setGithubPrs(Boolean(githubConnection?.access_data?.prs ?? true));
  }, [githubConnection]);

  useEffect(() => {
    setDriveFolder((driveConnection?.access_data?.folder as string) ?? "");
  }, [driveConnection]);

  useEffect(() => {
    setWebhookForm({ id: undefined, targetUrl: "", secret: "" });
  }, [scopeProjectId]);

  const isManageScope = selectedScope !== ALL_SCOPE;

  const handleSlackConnect = () => {
    if (!isManageScope) {
      toast({ title: "Select a project", description: "Choose a scope before connecting.", variant: "destructive" });
      return;
    }
    if (!slackChannel.trim()) {
      toast({ title: "Channel required", variant: "destructive" });
      return;
    }
    // TODO: Replace mock Slack connection with OAuth and bot installation.
    connectIntegrationMutation.mutate({
      provider: "slack",
      projectId: scopeProjectId ?? null,
      displayName: slackDisplayName || slackChannel,
      accessData: { channel: slackChannel.trim() },
    });
  };

  const handleSlackUpdate = () => {
    if (!slackConnection) return;
    if (!slackChannel.trim()) {
      toast({ title: "Channel required", variant: "destructive" });
      return;
    }
    updateIntegrationMutation.mutate({
      id: slackConnection.id,
      patch: {
        display_name: slackDisplayName || slackChannel,
        access_data: { channel: slackChannel.trim() },
      },
    });
  };

  const handleGitHubConnect = () => {
    if (!isManageScope) {
      toast({ title: "Select a project", description: "Choose a scope before connecting.", variant: "destructive" });
      return;
    }
    try {
      validateRepoFormat(githubRepo);
    } catch (error) {
      toast({
        title: "Invalid repo",
        description: error instanceof Error ? error.message : "Check the repository name.",
        variant: "destructive",
      });
      return;
    }
    // TODO: Replace manual repo entry with GitHub App authorization.
    connectIntegrationMutation.mutate({
      provider: "github",
      projectId: scopeProjectId ?? null,
      displayName: githubRepo,
      accessData: { repo: githubRepo.trim(), issues: githubIssues, prs: githubPrs },
    });
  };

  const handleGitHubUpdate = () => {
    if (!githubConnection) return;
    try {
      validateRepoFormat(githubRepo);
    } catch (error) {
      toast({
        title: "Invalid repo",
        description: error instanceof Error ? error.message : "Check the repository name.",
        variant: "destructive",
      });
      return;
    }
    updateIntegrationMutation.mutate({
      id: githubConnection.id,
      patch: {
        display_name: githubRepo.trim(),
        access_data: { repo: githubRepo.trim(), issues: githubIssues, prs: githubPrs },
      },
    });
  };

  const handleDriveConnect = () => {
    if (!isManageScope) {
      toast({ title: "Select a project", description: "Choose a scope before connecting.", variant: "destructive" });
      return;
    }
    if (!driveFolder.trim()) {
      toast({ title: "Folder required", variant: "destructive" });
      return;
    }
    // TODO: Request Drive API scopes through OAuth consent.
    connectIntegrationMutation.mutate({
      provider: "google_drive",
      projectId: scopeProjectId ?? null,
      displayName: driveFolder.trim(),
      accessData: { folder: driveFolder.trim() },
    });
  };

  const handleDriveUpdate = () => {
    if (!driveConnection) return;
    if (!driveFolder.trim()) {
      toast({ title: "Folder required", variant: "destructive" });
      return;
    }
    updateIntegrationMutation.mutate({
      id: driveConnection.id,
      patch: {
        display_name: driveFolder.trim(),
        access_data: { folder: driveFolder.trim() },
      },
    });
  };

  const handleWebhookSubmit = () => {
    if (!isManageScope) {
      toast({ title: "Select a project", description: "Choose a scope before creating.", variant: "destructive" });
      return;
    }
    if (!webhookForm.targetUrl.trim()) {
      toast({ title: "URL required", variant: "destructive" });
      return;
    }

    if (webhookForm.id) {
      updateWebhookMutation.mutate({
        id: webhookForm.id,
        patch: {
          target_url: webhookForm.targetUrl.trim(),
          secret: webhookForm.secret.trim() || null,
        },
      });
    } else {
      createWebhookMutation.mutate({
        projectId: scopeProjectId ?? null,
        targetUrl: webhookForm.targetUrl.trim(),
        secret: webhookForm.secret.trim() || null,
      });
    }

    setWebhookForm({ id: undefined, targetUrl: "", secret: "" });
  };

  const handleWebhookEdit = (hook: Webhook) => {
    setWebhookForm({ id: hook.id, targetUrl: hook.target_url, secret: hook.secret ?? "" });
  };

  const slackTestingDisabled = !slackConnection && !isManageScope;
  const githubTestingDisabled = !githubConnection && !isManageScope;
  const driveTestingDisabled = !driveConnection && !isManageScope;

  const isLoading = integrationsCatalog.isLoading || userIntegrations.isLoading;

  const permissionError =
    userIntegrations.error &&
    (userIntegrations.error as Error).message?.toLowerCase().includes("permission");

  const webhookList = webhooks.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {enableProjectFilter && (
          <Select value={selectedScope} onValueChange={setSelectedScope}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SCOPE}>All projects</SelectItem>
              <SelectItem value={WORKSPACE_SCOPE}>Workspace</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name || "Untitled"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {permissionError && (
        <Alert variant="destructive">
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            You do not have access to integrations for this scope. Ask the project owner to grant permissions.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading integrations…</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Slack
              </CardTitle>
              <CardDescription>Send alerts to a Slack channel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedScope === ALL_SCOPE ? (
                <AggregatorList connections={slackConnections} projectLookup={projectLookup} />
              ) : slackConnection ? (
                <ConnectedStatus
                  label={slackConnection.display_name || slackConnection.access_data?.channel || "Slack"}
                  onDisconnect={() =>
                    disconnectIntegrationMutation.mutate({
                      id: slackConnection.id,
                      projectId: slackConnection.project_id ?? null,
                    })
                  }
                />
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  Not connected
                </Badge>
              )}
              {isManageScope && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Channel</label>
                    <Input
                      value={slackChannel}
                      onChange={(event) => setSlackChannel(event.target.value)}
                      placeholder="#handoffs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Display name</label>
                    <Input
                      value={slackDisplayName}
                      onChange={(event) => setSlackDisplayName(event.target.value)}
                      placeholder="Release alerts"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slackConnection ? (
                      <Button onClick={handleSlackUpdate} disabled={updateIntegrationMutation.isPending}>
                        {updateIntegrationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}
                        Update
                      </Button>
                    ) : (
                      <Button onClick={handleSlackConnect} disabled={connectIntegrationMutation.isPending}>
                        {connectIntegrationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log("Mock Slack message", slackChannel || "#general");
                        toast({ title: "Test sent", description: `Message sent to ${slackChannel || "#general"}` });
                      }}
                      disabled={slackTestingDisabled}
                    >
                      <Play className="mr-2 h-4 w-4" /> Test
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" /> GitHub
              </CardTitle>
              <CardDescription>Sync pull requests and issues with your tasks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedScope === ALL_SCOPE ? (
                <AggregatorList connections={githubConnections} projectLookup={projectLookup} />
              ) : githubConnection ? (
                <ConnectedStatus
                  label={githubConnection.display_name || githubConnection.access_data?.repo || "GitHub"}
                  onDisconnect={() =>
                    disconnectIntegrationMutation.mutate({
                      id: githubConnection.id,
                      projectId: githubConnection.project_id ?? null,
                    })
                  }
                />
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  Not connected
                </Badge>
              )}
              {isManageScope && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Repository</label>
                    <Input
                      value={githubRepo}
                      onChange={(event) => setGithubRepo(event.target.value)}
                      placeholder="owner/repo"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm">Issues</span>
                    <Switch checked={githubIssues} onCheckedChange={setGithubIssues} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <span className="text-sm">Pull requests</span>
                    <Switch checked={githubPrs} onCheckedChange={setGithubPrs} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {githubConnection ? (
                      <Button onClick={handleGitHubUpdate} disabled={updateIntegrationMutation.isPending}>
                        {updateIntegrationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}
                        Update
                      </Button>
                    ) : (
                      <Button onClick={handleGitHubConnect} disabled={connectIntegrationMutation.isPending}>
                        {connectIntegrationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log("Mock GitHub webhook", githubRepo);
                        toast({ title: "Test sent", description: `Checked ${githubRepo || "repository"}` });
                      }}
                      disabled={githubTestingDisabled}
                    >
                      <Play className="mr-2 h-4 w-4" /> Test
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" /> Google Drive
              </CardTitle>
              <CardDescription>Attach files from a shared folder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedScope === ALL_SCOPE ? (
                <AggregatorList connections={driveConnections} projectLookup={projectLookup} />
              ) : driveConnection ? (
                <ConnectedStatus
                  label={driveConnection.display_name || driveConnection.access_data?.folder || "Google Drive"}
                  onDisconnect={() =>
                    disconnectIntegrationMutation.mutate({
                      id: driveConnection.id,
                      projectId: driveConnection.project_id ?? null,
                    })
                  }
                />
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  Not connected
                </Badge>
              )}
              {isManageScope && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Folder ID</label>
                    <Input
                      value={driveFolder}
                      onChange={(event) => setDriveFolder(event.target.value)}
                      placeholder="drive folder id"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {driveConnection ? (
                      <Button onClick={handleDriveUpdate} disabled={updateIntegrationMutation.isPending}>
                        {updateIntegrationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}
                        Update
                      </Button>
                    ) : (
                      <Button onClick={handleDriveConnect} disabled={connectIntegrationMutation.isPending}>
                        {connectIntegrationMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plug className="mr-2 h-4 w-4" />
                        )}
                        Connect
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log("Mock Drive sync", driveFolder);
                        toast({ title: "Test sent", description: `Checked folder ${driveFolder || "ID"}` });
                      }}
                      disabled={driveTestingDisabled}
                    >
                      <Play className="mr-2 h-4 w-4" /> Test
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WebhookIcon className="h-5 w-5" /> Webhooks
              </CardTitle>
              <CardDescription>Send events to external systems.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedScope !== ALL_SCOPE && (
                <div className="space-y-3 rounded-md border p-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Target URL</label>
                      <Input
                        value={webhookForm.targetUrl}
                        onChange={(event) =>
                          setWebhookForm((prev) => ({ ...prev, targetUrl: event.target.value }))
                        }
                        placeholder="https://example.com/webhook"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Secret</label>
                      <Input
                        value={webhookForm.secret}
                        onChange={(event) =>
                          setWebhookForm((prev) => ({ ...prev, secret: event.target.value }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleWebhookSubmit} disabled={createWebhookMutation.isPending || updateWebhookMutation.isPending}>
                      {(createWebhookMutation.isPending || updateWebhookMutation.isPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LinkIcon className="mr-2 h-4 w-4" />
                      )}
                      {webhookForm.id ? "Update webhook" : "Create webhook"}
                    </Button>
                    {webhookForm.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setWebhookForm({ id: undefined, targetUrl: "", secret: "" })}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {webhooks.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading webhooks…</p>
                ) : webhookList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No webhooks configured.</p>
                ) : (
                  <div className="space-y-3">
                    {webhookList.map((hook) => (
                      <div key={hook.id} className="rounded-md border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{hook.target_url}</p>
                            <p className="text-sm text-muted-foreground">
                              {projectLabel(hook.project_id, projectLookup)} • {new Date(hook.created_at).toLocaleString()}
                            </p>
                            {hook.secret && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Secret: {visibleSecrets[hook.id] ? hook.secret : "••••••••"}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {hook.secret && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  setVisibleSecrets((prev) => ({
                                    ...prev,
                                    [hook.id]: !prev[hook.id],
                                  }))
                                }
                              >
                                {visibleSecrets[hook.id] ? "Hide" : "Show"}
                              </Button>
                            )}
                            <Switch
                              checked={hook.active}
                              onCheckedChange={(value) =>
                                updateWebhookMutation.mutate({ id: hook.id, patch: { active: value } })
                              }
                            />
                            <Button type="button" variant="outline" onClick={() => handleWebhookEdit(hook)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteWebhookMutation.mutate(hook.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Secrets are masked. Select a project or workspace to add new webhooks.
              </p>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function AggregatorList({
  connections,
  projectLookup,
}: {
  connections: UserIntegration[];
  projectLookup: Map<string, string>;
}) {
  if (connections.length === 0) {
    return <p className="text-sm text-muted-foreground">No connections found.</p>;
  }
  return (
    <div className="space-y-2">
      {connections.map((connection) => (
        <div key={connection.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span>{connection.display_name || PROVIDER_LABELS[connection.provider]}</span>
          <Badge variant="secondary">{projectLabel(connection.project_id ?? null, projectLookup)}</Badge>
        </div>
      ))}
    </div>
  );
}

function ConnectedStatus({ label, onDisconnect }: { label: string; onDisconnect: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <Button type="button" variant="ghost" className="text-destructive" onClick={onDisconnect}>
        <Trash2 className="mr-2 h-4 w-4" /> Disconnect
      </Button>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <IntegrationsView
      heading="Integrations"
      description="Connect tools to automate your workflow."
      breadcrumbs={[{ label: "Integrations", href: "/integrations" }]}
      documentTitle="Integrations | Outpaged"
      enableProjectFilter
    />
  );
}

export function ProjectIntegrationsPage() {
  const params = useParams<{ projectId?: string; id?: string }>();
  const projectId = params.projectId ?? params.id ?? "";
  const { data: project } = useProjectSummary(projectId);
  const projectLabelValue = project?.name?.trim() || projectId || "Project";

  const breadcrumbs = useMemo(
    () => [
      { label: "Projects", href: "/projects" },
      { label: projectLabelValue, href: projectId ? `/projects/${projectId}` : "/projects" },
      { label: "Integrations", href: projectId ? `/projects/${projectId}/integrations` : undefined },
    ],
    [projectId, projectLabelValue]
  );

  return (
    <IntegrationsView
      heading="Integrations"
      description={project?.name ? `Connections for ${project.name}` : "Project integrations"}
      breadcrumbs={breadcrumbs}
      documentTitle={`Projects / ${projectLabelValue} / Integrations | Outpaged`}
      fixedProjectId={projectId || undefined}
    />
  );
}
