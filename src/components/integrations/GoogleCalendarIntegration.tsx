import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users, Settings, CheckCircle2 } from "lucide-react";
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

interface CalendarConfig {
  enabled: boolean;
  syncMilestones: boolean;
  syncSprints: boolean;
  syncReleases: boolean;
  showTeamAvailability: boolean;
  calendarId: string;
}

export function GoogleCalendarIntegration() {
  const { toast } = useToast();
  const [config, setConfig] = useState<CalendarConfig>({
    enabled: false,
    syncMilestones: true,
    syncSprints: true,
    syncReleases: true,
    showTeamAvailability: true,
    calendarId: "primary",
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    // In a real implementation, this would trigger OAuth flow
    toast({
      title: "Google Calendar Connection",
      description: "OAuth flow would be triggered here",
    });
    setIsConnected(true);
  };

  const handleSaveConfig = () => {
    toast({
      title: "Calendar Settings Saved",
      description: "Your Google Calendar integration has been configured",
    });
    setShowSettings(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar Integration
            </CardTitle>
            <CardDescription>
              Sync milestones, sprints, and team availability
            </CardDescription>
          </div>
          {isConnected && (
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Calendar Sync Settings</DialogTitle>
                  <DialogDescription>
                    Choose what to sync with Google Calendar
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Enable Calendar Sync</Label>
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Calendar Selection</Label>
                    <Select
                      value={config.calendarId}
                      onValueChange={(value) =>
                        setConfig({ ...config, calendarId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary Calendar</SelectItem>
                        <SelectItem value="work">Work Calendar</SelectItem>
                        <SelectItem value="team">Team Calendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Label>Sync Options</Label>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="syncMilestones" className="text-sm">
                          Milestone Due Dates
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Add milestone dates to calendar
                        </p>
                      </div>
                      <Switch
                        id="syncMilestones"
                        checked={config.syncMilestones}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, syncMilestones: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="syncSprints" className="text-sm">
                          Sprint Cycles
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Block sprint start/end dates
                        </p>
                      </div>
                      <Switch
                        id="syncSprints"
                        checked={config.syncSprints}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, syncSprints: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="syncReleases" className="text-sm">
                          Release Dates
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Track release windows
                        </p>
                      </div>
                      <Switch
                        id="syncReleases"
                        checked={config.syncReleases}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, syncReleases: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showTeamAvailability" className="text-sm">
                          Team Availability
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Show busy hours for workload planning
                        </p>
                      </div>
                      <Switch
                        id="showTeamAvailability"
                        checked={config.showTeamAvailability}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, showTeamAvailability: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig}>Save Settings</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected to Google Calendar
            </div>

            {config.enabled && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Events Synced</p>
                          <p className="text-xs text-muted-foreground">
                            {[config.syncMilestones, config.syncSprints, config.syncReleases].filter(Boolean).length} types
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Team Availability</p>
                          <p className="text-xs text-muted-foreground">
                            {config.showTeamAvailability ? "Visible" : "Hidden"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="text-sm font-medium mb-2">Active Sync Settings</h4>
                  <div className="space-y-2">
                    {config.syncMilestones && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Milestone due dates</span>
                      </div>
                    )}
                    {config.syncSprints && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Sprint start/end dates</span>
                      </div>
                    )}
                    {config.syncReleases && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Release windows</span>
                      </div>
                    )}
                    {config.showTeamAvailability && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Team member busy hours</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Google Calendar to sync project dates
            </p>
            <Button onClick={handleConnect}>
              <Calendar className="mr-2 h-4 w-4" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
