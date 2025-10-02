import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitHubIntegrationEnhanced } from "@/components/integrations/GitHubIntegrationEnhanced";
import { SlackIntegrationEnhanced } from "@/components/integrations/SlackIntegrationEnhanced";
import { GoogleCalendarIntegration } from "@/components/integrations/GoogleCalendarIntegration";
import { FigmaIntegration } from "@/components/integrations/FigmaIntegration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, MessageSquare, Calendar, Palette, Webhook, Download, Upload } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { WebhookManager } from "@/components/integrations/WebhookManager";
import { JiraImporter } from "@/components/import-export/JiraImporter";
import { TaskExporter } from "@/components/import-export/TaskExporter";

export default function Integrations() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project") || "";

  const integrations = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Link branches, sync PR status, and auto-update tasks',
      icon: Github,
      status: 'available',
      component: <GitHubIntegrationEnhanced />,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Notifications, unfurls, and slash commands',
      icon: MessageSquare,
      status: 'available',
      component: <SlackIntegrationEnhanced />,
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: 'Sync milestones and due dates to your calendar',
      icon: Calendar,
      status: 'available',
      component: <GoogleCalendarIntegration />,
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Design links and preview thumbnails',
      icon: Palette,
      status: 'available',
      component: <FigmaIntegration />,
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      description: 'Custom webhooks for external integrations',
      icon: Webhook,
      status: 'available',
      component: <WebhookManager />,
    },
    {
      id: 'import',
      name: 'Import',
      description: 'Import from Jira, CSV, and other tools',
      icon: Download,
      status: 'available',
      component: <JiraImporter projectId={projectId} />,
    },
    {
      id: 'export',
      name: 'Export',
      description: 'Export tasks to CSV, JSON, Markdown',
      icon: Upload,
      status: 'available',
      component: <TaskExporter projectId={projectId} />,
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your favorite tools to streamline your workflow
        </p>
      </div>

      {!projectId && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Select a project to configure integrations. Some integrations are project-specific.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="github" className="space-y-6">
        <TabsList>
          {integrations.map((integration) => (
            <TabsTrigger key={integration.id} value={integration.id}>
              <integration.icon className="h-4 w-4 mr-2" />
              {integration.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {integrations.map((integration) => (
          <TabsContent key={integration.id} value={integration.id}>
            {integration.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
