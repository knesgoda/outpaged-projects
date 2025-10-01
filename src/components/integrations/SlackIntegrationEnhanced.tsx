import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Hash, Bell, Zap, Settings, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SlackConfig {
  enabled: boolean;
  workspaceUrl: string;
  defaultChannel: string;
  enableUnfurling: boolean;
  enableSlashCommands: boolean;
  notificationChannels: {
    incidents: string;
    releases: string;
    handoffs: string;
  };
}

export function SlackIntegrationEnhanced() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SlackConfig>({
    enabled: false,
    workspaceUrl: "",
    defaultChannel: "#general",
    enableUnfurling: true,
    enableSlashCommands: true,
    notificationChannels: {
      incidents: "#incidents",
      releases: "#releases",
      handoffs: "#handoffs",
    },
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleSaveConfig = () => {
    toast({
      title: "Slack Integration Configured",
      description: "Your Slack settings have been saved",
    });
    setShowSettings(false);
  };

  const slashCommands = [
    { command: "/op create", description: "Create a new task" },
    { command: "/op search [query]", description: "Search for tasks" },
    { command: "/op me", description: "Show your assigned tasks" },
    { command: "/op handoff [task-id]", description: "Create a handoff" },
    { command: "/op status [task-id]", description: "Get task status" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Slack Integration
              </CardTitle>
              <CardDescription>
                Connect tasks to Slack channels with unfurling and slash commands
              </CardDescription>
            </div>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Slack Configuration</DialogTitle>
                  <DialogDescription>
                    Set up Slack integration for your workspace
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Enable Slack Integration</Label>
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspaceUrl">Workspace URL</Label>
                    <Input
                      id="workspaceUrl"
                      placeholder="https://outpaged.slack.com"
                      value={config.workspaceUrl}
                      onChange={(e) =>
                        setConfig({ ...config, workspaceUrl: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultChannel">Default Channel</Label>
                    <Input
                      id="defaultChannel"
                      placeholder="#general"
                      value={config.defaultChannel}
                      onChange={(e) =>
                        setConfig({ ...config, defaultChannel: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Event Notification Channels</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="incidentsChannel" className="text-sm">Incidents</Label>
                      <Input
                        id="incidentsChannel"
                        placeholder="#incidents"
                        value={config.notificationChannels.incidents}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            notificationChannels: {
                              ...config.notificationChannels,
                              incidents: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="releasesChannel" className="text-sm">Releases</Label>
                      <Input
                        id="releasesChannel"
                        placeholder="#releases"
                        value={config.notificationChannels.releases}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            notificationChannels: {
                              ...config.notificationChannels,
                              releases: e.target.value,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="handoffsChannel" className="text-sm">Handoffs</Label>
                      <Input
                        id="handoffsChannel"
                        placeholder="#handoffs"
                        value={config.notificationChannels.handoffs}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            notificationChannels: {
                              ...config.notificationChannels,
                              handoffs: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableUnfurling">Link Unfurling</Label>
                    <Switch
                      id="enableUnfurling"
                      checked={config.enableUnfurling}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableUnfurling: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="enableSlashCommands">Slash Commands</Label>
                    <Switch
                      id="enableSlashCommands"
                      checked={config.enableSlashCommands}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableSlashCommands: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig}>Save Configuration</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {config.enabled ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Link2 className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Link Unfurling</p>
                        <p className="text-xs text-muted-foreground">
                          {config.enableUnfurling ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Slash Commands</p>
                        <p className="text-xs text-muted-foreground">
                          {config.enableSlashCommands ? `${slashCommands.length} commands` : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Bell className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Notifications</p>
                        <p className="text-xs text-muted-foreground">
                          3 channels configured
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Configured Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Default
                    </span>
                    <Badge variant="outline">{config.defaultChannel}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Incidents
                    </span>
                    <Badge variant="outline">{config.notificationChannels.incidents}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Releases
                    </span>
                    <Badge variant="outline">{config.notificationChannels.releases}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Handoffs
                    </span>
                    <Badge variant="outline">{config.notificationChannels.handoffs}</Badge>
                  </div>
                </CardContent>
              </Card>

              {config.enableSlashCommands && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Available Slash Commands</CardTitle>
                    <CardDescription>Use these commands in any Slack channel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {slashCommands.map((cmd) => (
                        <div key={cmd.command} className="flex items-start gap-3 py-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {cmd.command}
                          </code>
                          <span className="text-sm text-muted-foreground">{cmd.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Slack integration is not configured
              </p>
              <Button onClick={() => setShowSettings(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
