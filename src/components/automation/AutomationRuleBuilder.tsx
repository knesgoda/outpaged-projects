import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Settings, Zap } from "lucide-react";
import { useAutomation } from "@/hooks/useAutomation";
import type { Json } from "@/integrations/supabase/types";

type AutomationTriggerType = 
  | "status_change"
  | "assignment_change" 
  | "due_date_approaching"
  | "field_update"
  | "task_created"
  | "comment_added"
  | "time_logged";

type AutomationActionType = 
  | "assign_user"
  | "change_status"
  | "update_field"
  | "send_notification"
  | "create_subtask"
  | "add_comment"
  | "set_due_date"
  | "move_to_project";

interface AutomationRuleBuilderProps {
  projectId: string;
  onClose: () => void;
  onSave?: () => void;
}

interface TriggerConfig {
  trigger_type: AutomationTriggerType;
  conditions: any[];
}

interface ActionConfig {
  action_type: AutomationActionType;
  action_config: any;
  execution_order: number;
}

const triggerTypeLabels: Record<AutomationTriggerType, string> = {
  status_change: "Status Changes",
  assignment_change: "Assignment Changes",
  due_date_approaching: "Due Date Approaching",
  field_update: "Field Updated",
  task_created: "Task Created",
  comment_added: "Comment Added",
  time_logged: "Time Logged",
};

const actionTypeLabels: Record<AutomationActionType, string> = {
  assign_user: "Assign User",
  change_status: "Change Status",
  update_field: "Update Field",
  send_notification: "Send Notification",
  create_subtask: "Create Subtask",
  add_comment: "Add Comment",
  set_due_date: "Set Due Date",
  move_to_project: "Move to Project",
};

export const AutomationRuleBuilder: React.FC<AutomationRuleBuilderProps> = ({
  projectId,
  onClose,
  onSave,
}) => {
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [trigger, setTrigger] = useState<TriggerConfig>({
    trigger_type: "status_change",
    conditions: [],
  });
  const [actions, setActions] = useState<ActionConfig[]>([
    {
      action_type: "assign_user",
      action_config: {},
      execution_order: 1,
    },
  ]);

  const { createAutomationRule, loading } = useAutomation(projectId);

  const handleAddAction = () => {
    setActions([
      ...actions,
      {
        action_type: "assign_user",
        action_config: {},
        execution_order: actions.length + 1,
      },
    ]);
  };

  const handleRemoveAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    // Reorder execution order
    const reorderedActions = newActions.map((action, i) => ({
      ...action,
      execution_order: i + 1,
    }));
    setActions(reorderedActions);
  };

  const handleActionChange = (index: number, field: keyof ActionConfig, value: any) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setActions(newActions);
  };

  const handleSave = async () => {
    if (!ruleName.trim()) {
      return;
    }

    try {
      await createAutomationRule({
        project_id: projectId,
        name: ruleName,
        description: ruleDescription,
        trigger: {
          trigger_type: trigger.trigger_type,
          conditions: trigger.conditions as Json,
        },
        actions: actions.map(action => ({
          action_type: action.action_type,
          action_config: action.action_config as Json,
          execution_order: action.execution_order,
        })),
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error("Error saving automation rule:", error);
    }
  };

  const renderActionConfig = (action: ActionConfig, index: number) => {
    switch (action.action_type) {
      case "change_status":
        return (
          <Select
            value={action.action_config?.status || ""}
            onValueChange={(value) =>
              handleActionChange(index, "action_config", { status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        );

      case "add_comment":
        return (
          <Textarea
            placeholder="Enter comment text..."
            value={action.action_config?.content || ""}
            onChange={(e) =>
              handleActionChange(index, "action_config", { content: e.target.value })
            }
          />
        );

      case "assign_user":
        return (
          <Input
            placeholder="User ID or email"
            value={action.action_config?.user_id || ""}
            onChange={(e) =>
              handleActionChange(index, "action_config", { user_id: e.target.value })
            }
          />
        );

      default:
        return (
          <Input
            placeholder="Configuration JSON"
            value={JSON.stringify(action.action_config || {})}
            onChange={(e) => {
              try {
                const config = JSON.parse(e.target.value);
                handleActionChange(index, "action_config", config);
              } catch {
                // Invalid JSON, keep the string
              }
            }}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Create Automation Rule</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ruleName">Rule Name</Label>
            <Input
              id="ruleName"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Enter rule name..."
            />
          </div>
          
          <div>
            <Label htmlFor="ruleDescription">Description (Optional)</Label>
            <Textarea
              id="ruleDescription"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Describe what this rule does..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When (Trigger)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Trigger Type</Label>
              <Select
                value={trigger.trigger_type}
                onValueChange={(value: AutomationTriggerType) =>
                  setTrigger({ ...trigger, trigger_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <Badge variant="outline">{triggerTypeLabels[trigger.trigger_type]}</Badge>
              <p className="mt-2">
                This rule will trigger when {triggerTypeLabels[trigger.trigger_type].toLowerCase()}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Then (Actions)</CardTitle>
            <Button onClick={handleAddAction} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actions.map((action, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{index + 1}</Badge>
                    <Settings className="h-4 w-4" />
                  </div>
                  {actions.length > 1 && (
                    <Button
                      onClick={() => handleRemoveAction(index)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div>
                  <Label>Action Type</Label>
                  <Select
                    value={action.action_type}
                    onValueChange={(value: AutomationActionType) =>
                      handleActionChange(index, "action_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(actionTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Configuration</Label>
                  {renderActionConfig(action, index)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading || !ruleName.trim()}>
          {loading ? "Creating..." : "Create Rule"}
        </Button>
      </div>
    </div>
  );
};
