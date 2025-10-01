import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_WORKFLOW_RULES } from "@/lib/workflowValidation";
import { Shield, CheckCircle2, AlertCircle } from "lucide-react";

export function WorkflowRulesManager() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Workflow Validation Rules</h3>
        <p className="text-sm text-muted-foreground">
          Active validation and approval rules for status transitions
        </p>
      </div>

      {Object.entries(DEFAULT_WORKFLOW_RULES).map(([team, rules]) => (
        <div key={team} className="space-y-3">
          <h4 className="text-base font-medium capitalize flex items-center gap-2">
            {team} Team
            <Badge variant="secondary">{rules.length} rules</Badge>
          </h4>
          
          <div className="grid gap-3 md:grid-cols-2">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">
                      → {rule.toStatus.replace(/_/g, " ")}
                    </CardTitle>
                    {rule.requiresApproval && (
                      <Shield className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  {rule.validationMessage && (
                    <CardDescription className="text-xs">
                      {rule.validationMessage}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {rule.requiredFields.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Required Fields
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {rule.requiredFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.requiresApproval && rule.approvalRoles && (
                    <div>
                      <p className="text-xs font-medium mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        Approval Roles
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {rule.approvalRoles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Item type: <span className="font-medium">{rule.itemType}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
