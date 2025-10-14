import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { DashboardDefinition } from "@/hooks/useAnalytics";
import { Badge } from "@/components/ui/badge";

export default function DashboardsPage() {
  const { listDashboards } = useAnalytics();
  const [presentationMode, setPresentationMode] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardDefinition[]>([]);

  useEffect(() => {
    let mounted = true;
    listDashboards()
      .then((result) => {
        if (mounted) {
          setDashboards(result);
        }
      })
      .catch(() => {
        setDashboards([]);
      });
    return () => {
      mounted = false;
    };
  }, [listDashboards]);

  const handleRefresh = () => {
    listDashboards().then(setDashboards).catch(() => setDashboards([]));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Dashboards</CardTitle>
            <p className="text-sm text-muted-foreground">
              Build secure canvases with cross-filtering, subscriptions, and presentation controls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={presentationMode} onCheckedChange={setPresentationMode} />
            <span className="text-sm text-muted-foreground">Presentation mode</span>
            <Button onClick={handleRefresh}>Refresh</Button>
          </div>
        </CardHeader>
      </Card>
      <Tabs defaultValue={dashboards[0]?.id ?? ""}>
        <TabsList className="flex-wrap">
          {dashboards.map((dashboard) => (
            <TabsTrigger key={dashboard.id} value={dashboard.id}>
              {dashboard.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {dashboards.map((dashboard) => (
          <TabsContent key={dashboard.id} value={dashboard.id}>
            <Card className={presentationMode ? "ring-2 ring-primary" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{dashboard.title}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">Theme: {(dashboard as any).presentation?.theme ?? "light"}</Badge>
                    {dashboard.refreshCadenceMinutes ? (
                      <Badge variant="secondary">Auto refresh {dashboard.refreshCadenceMinutes}m</Badge>
                    ) : null}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {dashboard.tiles.map((tile) => (
                    <div
                      key={tile.id}
                      className="flex h-40 flex-col justify-between rounded border border-dashed p-4"
                    >
                      <div>
                        <p className="text-sm font-medium">{tile.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {tile.type} · refresh every {tile.refreshCadenceMinutes}m
                        </p>
                        {tile.crossFilters?.enabled ? (
                          <p className="text-xs text-muted-foreground">Cross filters: {tile.crossFilters.mode}</p>
                        ) : null}
                      </div>
                      <Button size="sm" variant="outline">
                        Open report
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
