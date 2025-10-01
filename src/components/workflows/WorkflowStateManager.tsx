import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";

interface WorkflowState {
  id: string;
  name: string;
  category: "marketing" | "operations" | "software" | "design";
  order: number;
  requiresApproval?: boolean;
  requiredFields?: string[];
}

interface WorkflowTransition {
  from: string;
  to: string;
  conditions?: string[];
}

const MARKETING_WORKFLOW: WorkflowState[] = [
  { id: "intake", name: "Intake", category: "marketing", order: 1 },
  { id: "plan", name: "Plan", category: "marketing", order: 2 },
  { id: "copy_draft", name: "Copy Draft", category: "marketing", order: 3 },
  { id: "asset_production", name: "Asset Production", category: "marketing", order: 4 },
  { id: "channel_build", name: "Channel Build", category: "marketing", order: 5 },
  { id: "qa", name: "QA", category: "marketing", order: 6, requiresApproval: true },
  { id: "scheduled", name: "Scheduled", category: "marketing", order: 7 },
  { id: "live", name: "Live", category: "marketing", order: 8 },
  { id: "wrap", name: "Wrap", category: "marketing", order: 9, requiredFields: ["performance_summary", "metrics_link"] },
];

const OPERATIONS_WORKFLOW: WorkflowState[] = [
  { id: "submitted", name: "Submitted", category: "operations", order: 1 },
  { id: "triage", name: "Triage", category: "operations", order: 2, requiredFields: ["sla_classification"] },
  { id: "approved", name: "Approved", category: "operations", order: 3, requiresApproval: true },
  { id: "in_progress", name: "In Progress", category: "operations", order: 4 },
  { id: "waiting_vendor", name: "Waiting on Vendor", category: "operations", order: 5, requiredFields: ["vendor_name", "vendor_contact", "sla_target"] },
  { id: "qa_validation", name: "QA/Validation", category: "operations", order: 6 },
  { id: "done", name: "Done", category: "operations", order: 7 },
];

interface WorkflowStateManagerProps {
  workflowType: "marketing" | "operations";
  onSave?: (states: WorkflowState[], transitions: WorkflowTransition[]) => void;
}

export function WorkflowStateManager({ workflowType, onSave }: WorkflowStateManagerProps) {
  const defaultStates = workflowType === "marketing" ? MARKETING_WORKFLOW : OPERATIONS_WORKFLOW;
  const [states, setStates] = useState<WorkflowState[]>(defaultStates);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);

  const addState = () => {
    const newState: WorkflowState = {
      id: `state_${Date.now()}`,
      name: "New State",
      category: workflowType,
      order: states.length + 1,
    };
    setStates([...states, newState]);
  };

  const updateState = (id: string, updates: Partial<WorkflowState>) => {
    setStates(states.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeState = (id: string) => {
    setStates(states.filter(s => s.id !== id));
  };

  const handleSave = () => {
    onSave?.(states, transitions);
    toast.success("Workflow configuration saved");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">{workflowType} Workflow Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define states and transitions for {workflowType} items
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addState}>
                <Plus className="h-4 w-4 mr-2" />
                Add State
              </Button>
              <Button onClick={handleSave}>
                Save Workflow
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {states.map((state, index) => (
              <Card key={state.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`name-${state.id}`}>State Name</Label>
                        <Input
                          id={`name-${state.id}`}
                          value={state.name}
                          onChange={(e) => updateState(state.id, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`order-${state.id}`}>Order</Label>
                        <Input
                          id={`order-${state.id}`}
                          type="number"
                          value={state.order}
                          onChange={(e) => updateState(state.id, { order: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`approval-${state.id}`}
                            checked={state.requiresApproval || false}
                            onChange={(e) => updateState(state.id, { requiresApproval: e.target.checked })}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`approval-${state.id}`} className="flex items-center gap-1">
                            <Shield className="h-4 w-4" />
                            Requires Approval
                          </Label>
                        </div>
                        {state.requiresApproval && (
                          <Badge variant="secondary">Approval Gate</Badge>
                        )}
                      </div>
                      {state.requiredFields && state.requiredFields.length > 0 && (
                        <div className="col-span-2">
                          <Label>Required Fields</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {state.requiredFields.map(field => (
                              <Badge key={field} variant="outline">
                                {field.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeState(state.id)}
                      disabled={states.length <= 2}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {states.length > 1 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                State Flow
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                {states
                  .sort((a, b) => a.order - b.order)
                  .map((state, index) => (
                    <div key={state.id} className="flex items-center gap-2">
                      <Badge variant={state.requiresApproval ? "default" : "secondary"}>
                        {state.name}
                      </Badge>
                      {index < states.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
