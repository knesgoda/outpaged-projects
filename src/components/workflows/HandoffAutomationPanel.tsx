import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HANDOFF_FLOWS } from "@/lib/handoffConfig";
import { ArrowRight, CheckCircle2, Package, AlertCircle } from "lucide-react";

export function HandoffAutomationPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Automated Handoff Flows</h3>
        <p className="text-sm text-muted-foreground">
          These flows automatically trigger when tasks reach specific statuses
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {HANDOFF_FLOWS.map((flow) => (
          <Card key={flow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{flow.fromTeam}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{flow.toTeam}</Badge>
                </div>
                {flow.autoCreateTarget && (
                  <Badge variant="secondary" className="gap-1">
                    <Package className="h-3 w-3" />
                    Auto-create
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base">{flow.name}</CardTitle>
              <CardDescription>Triggered on: {flow.triggerStatus}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Exit Criteria
                </p>
                <ul className="space-y-1">
                  {Object.entries(flow.exitCriteria).map(([key, value]) => (
                    <li key={key} className="text-xs text-muted-foreground ml-6">
                      • {key.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Acceptance Checklist ({flow.acceptanceChecklist.length} items)
                </p>
                <ul className="space-y-1">
                  {flow.acceptanceChecklist.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground ml-6">
                      • {item.item}
                      {item.required && <span className="text-destructive">*</span>}
                    </li>
                  ))}
                  {flow.acceptanceChecklist.length > 3 && (
                    <li className="text-xs text-muted-foreground ml-6">
                      • +{flow.acceptanceChecklist.length - 3} more...
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex gap-2 text-xs">
                {flow.assetPackaging.includeAttachments && (
                  <Badge variant="secondary" className="text-xs">
                    Assets
                  </Badge>
                )}
                {flow.assetPackaging.includeComments && (
                  <Badge variant="secondary" className="text-xs">
                    Comments
                  </Badge>
                )}
                {flow.assetPackaging.includeRelatedTasks && (
                  <Badge variant="secondary" className="text-xs">
                    Related Tasks
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
