import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowUpRight } from "lucide-react";
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
import type { IntegrationKey } from "@/types";

const providers: Array<{
  key: IntegrationKey;
  title: string;
  description: string;
  href: string;
}> = [
  {
    key: "gmail",
    title: "Gmail",
    description: "Turn emails into tasks in seconds.",
    href: "/integrations/google?tab=gmail",
  },
  {
    key: "google_calendar",
    title: "Google Calendar",
    description: "Mirror milestones on shared calendars.",
    href: "/integrations/google?tab=calendar",
  },
  {
    key: "google_docs",
    title: "Google Docs",
    description: "Attach specs and briefs to work.",
    href: "/integrations/google?tab=docs",
  },
  {
    key: "github",
    title: "GitHub",
    description: "Link issues and automate status.",
    href: "/integrations/github",
  },
];

export function IntegrationsHome() {
  useEffect(() => {
    document.title = "Integrations";
  }, []);

  const { toast } = useToast();
  const {
    integrations,
    userIntegrations,
    isLoading,
    isRefreshing,
    isConnecting,
    isDisconnecting,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations();

  const connectionMap = useMemo(() => {
    return userIntegrations.reduce<Record<string, { id: string; displayName?: string | null }>>(
      (acc, integration) => {
        if (!integration.project_id) {
          acc[integration.provider] = {
            id: integration.id,
            displayName: integration.display_name,
          };
        }
        return acc;
      },
      {}
    );
  }, [userIntegrations]);

  const busy = isConnecting || isDisconnecting;

  const handleConnect = async (provider: IntegrationKey, displayName?: string) => {
    try {
      await connectIntegration({ provider: provider as any, displayName: displayName ?? undefined, accessData: { mock: true } });
      toast({ title: "Connected", description: `${providers.find((p) => p.key === provider)?.title ?? "Provider"} ready to use.` });
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
      toast({ title: "Disconnected", description: "Connection removed." });
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
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Integrations</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect Google Workspace, GitHub, and Gmail to keep context aligned.
            </p>
          </div>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => {
          const integrationRecord = integrations.find((item) => item.key === provider.key);
          const connection = connectionMap[provider.key];
          const connected = Boolean(connection);

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
                <div className="flex w-full flex-col gap-2">
                  <Link
                    to={provider.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Manage settings
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  {integrationRecord ? (
                    <p className="text-xs text-muted-foreground">
                      Configured keys: {Object.keys(integrationRecord.config || {}).length}
                    </p>
                  ) : null}
                  {connection?.displayName ? (
                    <p className="text-xs text-muted-foreground">Connected as {connection.displayName}</p>
                  ) : null}
                </div>
              }
            />
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Project integrations</h2>
          <p className="text-sm text-muted-foreground">
            Need per-project scopes? Open a project and use Integrations in the sidebar to connect Gmail, Calendar, Docs, or GitHub just for that workstream.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/projects"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Browse projects
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default IntegrationsHome;
