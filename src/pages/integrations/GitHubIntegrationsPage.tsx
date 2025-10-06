import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectCard } from "@/components/integrations/ConnectCard";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/hooks/use-toast";
import { saveRepoDefault, listIssuesMock, linkIssue } from "@/services/github";
import type { IntegrationKey } from "@/types";
import { Loader2 } from "lucide-react";

export function GitHubIntegrationsPage() {
  useEffect(() => {
    document.title = "GitHub Integration";
  }, []);

  const { toast } = useToast();
  const {
    integrations,
    userIntegrations,
    isConnecting,
    isDisconnecting,
    isUpdatingConfig,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations();

  const connection = useMemo(() => {
    return userIntegrations.find((item) => item.provider === "github" && !item.project_id);
  }, [userIntegrations]);

  const githubConfig = integrations.find((item) => item.key === "github");
  const [defaultRepo, setDefaultRepo] = useState<string>(githubConfig?.config?.default_repo ?? "");
  const [savingRepo, setSavingRepo] = useState(false);

  useEffect(() => {
    const repo = githubConfig?.config?.default_repo;
    if (repo && !defaultRepo) {
      setDefaultRepo(repo);
    }
  }, [githubConfig?.config?.default_repo, defaultRepo]);

  const [issues, setIssues] = useState<Array<{ number: number; title: string; url: string }>>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issueTaskMap, setIssueTaskMap] = useState<Record<number, string>>({});
  const [linkingIssueNumber, setLinkingIssueNumber] = useState<number | null>(null);

  const [testIssueUrl, setTestIssueUrl] = useState("");
  const [testTaskId, setTestTaskId] = useState("");
  const [linkingFromUrl, setLinkingFromUrl] = useState(false);

  const busy = isConnecting || isDisconnecting;

  const handleConnect = async () => {
    try {
      await connectIntegration({ provider: "github", accessData: { mock: true } });
      toast({ title: "Connected", description: "GitHub ready to use." });
    } catch (error: any) {
      toast({
        title: "Connect failed",
        description: error?.message ?? "Try again after refreshing.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      await disconnectIntegration(connection.id);
      toast({ title: "Disconnected", description: "GitHub connection removed." });
    } catch (error: any) {
      toast({
        title: "Disconnect failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveRepo = async () => {
    if (!defaultRepo.trim()) {
      toast({
        title: "Repository required",
        description: "Use owner/name format.",
        variant: "destructive",
      });
      return;
    }

    setSavingRepo(true);
    try {
      await saveRepoDefault({ repoFullName: defaultRepo.trim() });
      toast({ title: "Default repo saved", description: defaultRepo.trim() });
    } catch (error: any) {
      toast({
        title: "Unable to save",
        description: error?.message ?? "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSavingRepo(false);
    }
  };

  const handleFetchIssues = async () => {
    if (!defaultRepo.trim()) {
      toast({
        title: "Set a repository",
        description: "Save a default repo to fetch mock issues.",
        variant: "destructive",
      });
      return;
    }

    setLoadingIssues(true);
    try {
      const data = await listIssuesMock({ repoFullName: defaultRepo.trim() });
      setIssues(data);
    } catch (error: any) {
      toast({
        title: "Unable to load issues",
        description: error?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleLinkIssue = async (number: number) => {
    const taskId = issueTaskMap[number]?.trim();
    if (!taskId) {
      toast({
        title: "Task ID required",
        description: "Enter the task ID to link the issue.",
        variant: "destructive",
      });
      return;
    }

    setLinkingIssueNumber(number);
    try {
      const issue = issues.find((item) => item.number === number);
      if (!issue) throw new Error("Issue not found");
      await linkIssue({
        taskId,
        repoFullName: defaultRepo.trim(),
        number,
        url: issue.url,
        title: issue.title,
        projectId: null,
      });
      toast({ title: "Issue linked", description: `Issue #${number} linked to the task.` });
      setIssueTaskMap((prev) => ({ ...prev, [number]: "" }));
    } catch (error: any) {
      toast({
        title: "Unable to link",
        description: error?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setLinkingIssueNumber(null);
    }
  };

  const handleLinkFromUrl = async () => {
    if (!testIssueUrl.trim() || !testTaskId.trim()) {
      toast({
        title: "Missing info",
        description: "Provide the issue URL and task ID.",
        variant: "destructive",
      });
      return;
    }

    const match = testIssueUrl.match(/github.com\/(.+?)\/issues\/(\d+)/i);
    if (!match) {
      toast({
        title: "Unrecognized URL",
        description: "Enter a standard GitHub issue URL.",
        variant: "destructive",
      });
      return;
    }

    const [, repoFullName, numberString] = match;
    const issueNumber = Number.parseInt(numberString, 10);
    if (Number.isNaN(issueNumber)) {
      toast({
        title: "Invalid issue number",
        description: "Check the URL and try again.",
        variant: "destructive",
      });
      return;
    }

    setLinkingFromUrl(true);
    try {
      await linkIssue({
        taskId: testTaskId.trim(),
        repoFullName,
        number: issueNumber,
        url: testIssueUrl.trim(),
        title: `Issue #${issueNumber}`,
        projectId: null,
      });
      toast({ title: "Issue linked", description: `Issue #${issueNumber} linked.` });
      setTestIssueUrl("");
      setTestTaskId("");
    } catch (error: any) {
      toast({
        title: "Unable to link",
        description: error?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setLinkingFromUrl(false);
    }
  };

  const webhookUrl = githubConfig?.config?.webhook_url ?? "https://<project>.functions.supabase.co/github-webhook";
  const webhookSecret = githubConfig?.config?.webhook_secret ?? "Set via environment";

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch {
      toast({
        title: "Copy failed",
        description: "Copy manually instead.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/integrations">Integrations</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>GitHub</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">GitHub</h1>
        <p className="text-sm text-muted-foreground">Link issues, branches, and pull requests with tasks.</p>
      </div>

      <ConnectCard
        title="GitHub"
        description="Connect a GitHub account or app for sync."
        isConnected={Boolean(connection)}
        isBusy={busy}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      >
        {connection?.display_name ? (
          <p className="text-sm text-muted-foreground">Connected as {connection.display_name}</p>
        ) : null}
      </ConnectCard>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Default repository</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="default-repo">Repository</Label>
            <Input
              id="default-repo"
              value={defaultRepo}
              onChange={(event) => setDefaultRepo(event.target.value)}
              placeholder="owner/name"
              disabled={isUpdatingConfig}
            />
          </div>
          <Button onClick={handleSaveRepo} disabled={savingRepo}>
            {savingRepo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save default repo
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Open issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleFetchIssues} variant="outline" size="sm" disabled={loadingIssues}>
            {loadingIssues ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Fetch mock issues
          </Button>
          <div className="space-y-3">
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues loaded yet.</p>
            ) : (
              issues.map((issue) => (
                <div key={issue.number} className="rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      #{issue.number} {issue.title}
                    </a>
                  </div>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <Label htmlFor={`issue-task-${issue.number}`} className="sr-only">
                        Task ID
                      </Label>
                      <Input
                        id={`issue-task-${issue.number}`}
                        value={issueTaskMap[issue.number] ?? ""}
                        onChange={(event) =>
                          setIssueTaskMap((prev) => ({ ...prev, [issue.number]: event.target.value }))
                        }
                        placeholder="Task UUID"
                      />
                    </div>
                    <Button
                      onClick={() => handleLinkIssue(issue.number)}
                      disabled={linkingIssueNumber === issue.number}
                    >
                      {linkingIssueNumber === issue.number ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Link to task
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Webhook setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Webhook URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input value={webhookUrl} readOnly />
              <Button variant="outline" onClick={() => handleCopy(webhookUrl, "Webhook URL")}>
                Copy URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this endpoint in your GitHub repository webhook configuration. Deliveries are logged for review.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Webhook secret</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input value={webhookSecret} readOnly />
              <Button variant="outline" onClick={() => handleCopy(webhookSecret, "Webhook secret")}>
                Copy secret
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Store the secret securely in Supabase config.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            TODO: validate signatures and trigger automations from webhook events.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick link test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="test-issue-url">Issue URL</Label>
            <Input
              id="test-issue-url"
              value={testIssueUrl}
              onChange={(event) => setTestIssueUrl(event.target.value)}
              placeholder="https://github.com/owner/repo/issues/123"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="test-task">Task ID</Label>
            <Input
              id="test-task"
              value={testTaskId}
              onChange={(event) => setTestTaskId(event.target.value)}
              placeholder="Task UUID"
            />
          </div>
          <Button onClick={handleLinkFromUrl} disabled={linkingFromUrl}>
            {linkingFromUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Link issue by URL
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default GitHubIntegrationsPage;
