import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { listIssuesMock, linkIssue } from "@/services/github";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { IntegrationKey } from "@/types";
import { Loader2 } from "lucide-react";

export function ProjectGitHubIntegrationsPage() {
  const { projectId = "" } = useParams();

  useEffect(() => {
    document.title = "Project GitHub Integration";
  }, []);

  const { toast } = useToast();
  const {
    userIntegrations,
    isConnecting,
    isDisconnecting,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations(projectId);

  const connection = useMemo(() => {
    return userIntegrations.find((item) => item.provider === "github" && item.project_id === projectId);
  }, [projectId, userIntegrations]);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (project?.name) {
      document.title = `${project.name} • GitHub integration`;
    }
  }, [project?.name]);

  const [repoName, setRepoName] = useState("");
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
      await connectIntegration({ provider: "github", projectId, accessData: { mock: true } });
      toast({ title: "Connected", description: "GitHub ready for this project." });
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
      toast({ title: "Disconnected", description: "Project connection removed." });
    } catch (error: any) {
      toast({
        title: "Disconnect failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFetchIssues = async () => {
    if (!repoName.trim()) {
      toast({
        title: "Repository required",
        description: "Use owner/name format.",
        variant: "destructive",
      });
      return;
    }

    setLoadingIssues(true);
    try {
      const data = await listIssuesMock({ repoFullName: repoName.trim() });
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
        repoFullName: repoName.trim(),
        number,
        url: issue.url,
        title: issue.title,
        projectId,
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
        projectId,
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
              <Link to="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {projectId ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}/overview`}>{project?.name ?? "Project"}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}/integrations`}>Integrations</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          ) : null}
          <BreadcrumbItem>
            <BreadcrumbPage>GitHub</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">GitHub for {project?.name ?? "project"}</h1>
        <p className="text-sm text-muted-foreground">Link project tasks with issues and pull requests.</p>
      </div>

      <ConnectCard
        title="GitHub"
        description="Connect repositories specifically for this project."
        isConnected={Boolean(connection)}
        isBusy={busy}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Fetch open issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="repo-name">Repository</Label>
            <Input
              id="repo-name"
              value={repoName}
              onChange={(event) => setRepoName(event.target.value)}
              placeholder="owner/name"
            />
          </div>
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
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    #{issue.number} {issue.title}
                  </a>
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

export default ProjectGitHubIntegrationsPage;
