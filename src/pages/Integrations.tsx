import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitHubIntegration } from "@/components/integrations/GitHubIntegration";
import { SlackProvider } from "@/components/integrations/SlackProvider";
import { CalendarIntegration } from "@/components/integrations/CalendarIntegration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, MessageSquare, Calendar, Palette } from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
      component: <GitHubIntegration projectId={projectId} />,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Notifications, unfurls, and slash commands',
      icon: MessageSquare,
      status: 'available',
      component: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Slack Integration
            </CardTitle>
            <CardDescription>
              Real-time notifications and task updates in your Slack workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Slack integration is configured at the workspace level. Contact your admin to enable Slack notifications.
            </p>
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: 'Sync milestones and due dates to your calendar',
      icon: Calendar,
      status: 'available',
      component: <CalendarIntegration />,
    },
    {
      id: 'figma',
      name: 'Figma',
      description: 'Design links and preview thumbnails',
      icon: Palette,
      status: 'coming_soon',
      component: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Figma Integration
              <Badge variant="outline">Coming Soon</Badge>
            </CardTitle>
            <CardDescription>
              Link designs and show preview thumbnails in tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This integration is coming soon. You'll be able to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Link Figma files to tasks</li>
              <li>Show design thumbnails inline</li>
              <li>Track design version history</li>
              <li>Get notified of design updates</li>
            </ul>
          </CardContent>
        </Card>
      ),
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
