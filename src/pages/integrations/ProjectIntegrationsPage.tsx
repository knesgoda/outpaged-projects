import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { ConnectCard } from "@/components/integrations/ConnectCard";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IntegrationKey } from "@/types";

const providers: Array<{
  key: IntegrationKey;
  title: string;
  description: string;
  href: (projectId: string) => string;
}> = [
  {
    key: "gmail",
    title: "Gmail",
    description: "Create project tasks directly from email threads.",
    href: (projectId) => `/projects/${projectId}/integrations/google?tab=gmail`,
  },
  {
    key: "google_calendar",
    title: "Google Calendar",
    description: "Keep milestones on your team calendar.",
    href: (projectId) => `/projects/${projectId}/integrations/google?tab=calendar`,
  },
  {
    key: "google_docs",
    title: "Google Docs",
    description: "Attach specs and docs to this project.",
    href: (projectId) => `/projects/${projectId}/integrations/google?tab=docs`,
  },
  {
    key: "github",
    title: "GitHub",
    description: "Link repositories and issues to project tasks.",
    href: (projectId) => `/projects/${projectId}/integrations/github`,
  },
];

export function ProjectIntegrationsPage() {
  const { projectId = "" } = useParams();

  useEffect(() => {
    document.title = "Project Integrations";
  }, []);

  const { toast } = useToast();
  const {
    userIntegrations,
    isConnecting,
    isDisconnecting,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations({ projectId });

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

  const connectionMap = useMemo(() => {
    return userIntegrations.reduce<Record<string, { id: string; displayName?: string | null }>>(
      (acc, integration) => {
        if (integration.project_id === projectId) {
          acc[integration.provider] = {
            id: integration.id,
            displayName: integration.display_name,
          };
        }
        return acc;
      },
      {}
    );
  }, [projectId, userIntegrations]);

  useEffect(() => {
    if (project?.name) {
      document.title = `${project.name} • Integrations`;
    }
  }, [project?.name]);

  const busy = isConnecting || isDisconnecting;

  const handleConnect = async (provider: IntegrationKey) => {
    try {
      await connectIntegration({ provider: provider as any, projectId, accessData: { mock: true } });
      toast({ title: "Connected", description: `${providers.find((p) => p.key === provider)?.title ?? "Provider"} connected.` });
    } catch (error: any) {
      toast({
        title: "Connect failed",
        description: error?.message ?? "Try again after refreshing.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (provider: IntegrationKey) => {
    const existing = connectionMap[provider];
    if (!existing) return;
    try {
      await disconnectIntegration(existing.id);
      toast({ title: "Disconnected", description: "Project connection removed." });
    } catch (error: any) {
      toast({
        title: "Disconnect failed",
        description: error?.message ?? "Please try again.",
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
            </>
          ) : null}
          <BreadcrumbItem>
            <BreadcrumbPage>Integrations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Project integrations</h1>
        <p className="text-sm text-muted-foreground">
          Configure Gmail, Google Workspace, and GitHub just for {project?.name ?? "this project"}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => {
          const connected = Boolean(connectionMap[provider.key]);
          return (
            <ConnectCard
              key={provider.key}
              title={provider.title}
              description={provider.description}
              isConnected={connected}
              isBusy={busy}
              onConnect={() => handleConnect(provider.key)}
              onDisconnect={() => handleDisconnect(provider.key)}
              footer={
                <Link
                  to={provider.href(projectId)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Manage {provider.title}
                </Link>
              }
            />
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-2 p-6">
          <p className="text-sm text-muted-foreground">
            Project-level connections use their own credentials and do not impact workspace defaults.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectIntegrationsPage;
