import { useCallback, useEffect, useState } from "react";
import { Monitor, Smartphone, AlertCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fetchDeviceSessions, triggerRemoteWipe } from "@/services/admin/deviceInventory";

interface Device {
  id: string;
  userId: string;
  userEmail: string;
  deviceType: "desktop" | "mobile";
  browser: string;
  lastSeen: Date;
  swVersion: string;
}

export function DeviceInventory() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await fetchDeviceSessions();
      setDevices(
        sessions.map((session) => ({
          id: session.id,
          userId: session.user_id,
          userEmail: session.user_email ?? session.user_id,
          deviceType: session.device_type === "mobile" ? "mobile" : "desktop",
          browser: session.browser ?? "Unknown browser",
          lastSeen: session.last_seen_at ? new Date(session.last_seen_at) : new Date(0),
          swVersion: session.sw_version ?? "unknown",
        }))
      );
    } catch (error) {
      console.error("Failed to load device inventory", error);
      toast({
        title: "Unable to load devices",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleRemoteWipe = async (deviceId: string) => {
    if (!confirm("Trigger remote wipe for this device? This will clear all offline data.")) return;

    const previousDevices = [...devices];
    setDevices((current) => current.filter((device) => device.id !== deviceId));

    try {
      await triggerRemoteWipe(deviceId);
      toast({
        title: "Remote wipe triggered",
        description: "The device will clear offline data on next sync",
      });
      await loadDevices();
    } catch (error) {
      setDevices(previousDevices);
      toast({
        title: "Failed to trigger wipe",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Devices & Browsers</CardTitle>
        <CardDescription>
          Monitor sessions and trigger remote wipe if needed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">No active devices</p>
              <p className="text-xs text-muted-foreground">
                Device inventory will appear here once users access the app
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-4">
                  {device.deviceType === "mobile" ? (
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{device.userEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.browser} • {device.swVersion} • Last seen{" "}
                      {formatDistanceToNow(device.lastSeen, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{device.deviceType}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoteWipe(device.id)}
                    aria-label="Trigger remote wipe"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
