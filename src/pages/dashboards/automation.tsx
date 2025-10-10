import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { AutomationDefinition } from "@/hooks/useAnalytics";

const DEFAULT_AUTOMATION: AutomationDefinition = {
  id: "governance-audit",
  name: "Governance audit",
  reportId: "governance",
  schedule: "0 9 * * 1",
  enabled: true,
  actions: [
    { type: "email", config: { to: ["governance@example.com"] } },
    { type: "slack", config: { channel: "#analytics" } },
  ],
  threshold: {
    metric: "events",
    operator: ">",
    value: 1000,
  },
};

export default function DashboardAutomationPage() {
  const { upsertAutomation } = useAnalytics();
  const [automation, setAutomation] = useState<AutomationDefinition>(DEFAULT_AUTOMATION);

  const handleSave = async () => {
    await upsertAutomation(automation);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Dashboard Automations</CardTitle>
            <p className="text-sm text-muted-foreground">
              Trigger alerts, exports, and subscriptions automatically from governed dashboards.
            </p>
          </div>
          <Button onClick={handleSave}>Save automation</Button>
        </CardHeader>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="space-y-3">
              <Input
                value={automation.name}
                onChange={(event) => setAutomation((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Automation name"
              />
              <Textarea
                placeholder="Describe the objective and governance coverage"
                value={(automation as unknown as { description?: string }).description ?? ""}
                onChange={(event) =>
                  setAutomation((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
              <div className="flex gap-2">
                <Badge variant="outline">Report: {automation.reportId}</Badge>
                <Badge variant="secondary">Schedule: {automation.schedule}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="thresholds">
          <Card>
            <CardContent className="space-y-2">
              <Input
                value={automation.threshold?.metric ?? ""}
                onChange={(event) =>
                  setAutomation((prev) => ({
                    ...prev,
                    threshold: {
                      ...(prev.threshold ?? { operator: ">", value: 0 }),
                      metric: event.target.value,
                    },
                  }))
                }
              />
              <Input
                value={automation.threshold?.value ?? 0}
                type="number"
                onChange={(event) =>
                  setAutomation((prev) => ({
                    ...prev,
                    threshold: {
                      ...(prev.threshold ?? { metric: "", operator: ">" }),
                      value: Number(event.target.value),
                    },
                  }))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardContent className="space-y-3">
              {automation.actions.map((action, index) => (
                <div key={index} className="rounded border p-3 text-sm">
                  <p className="font-medium">{action.type.toUpperCase()}</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {JSON.stringify(action.config, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
