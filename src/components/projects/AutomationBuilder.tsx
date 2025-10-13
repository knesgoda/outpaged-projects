// @ts-nocheck
import { useState, useCallback } from "react";
import { Plus, Save, Play, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TriggerBlock {
  id: string;
  type: string;
  config: Record<string, any>;
}

interface ConditionBlock {
  id: string;
  type: string;
  operator: 'AND' | 'OR' | 'NOT';
  config: Record<string, any>;
}

interface ActionBlock {
  id: string;
  type: string;
  config: Record<string, any>;
  branchId?: string;
}

interface AutomationBuilderProps {
  projectId: string;
  automationId?: string;
  onSave?: (automationId: string) => void;
}

const TRIGGER_TYPES = [
  { value: 'item_created', label: 'Item Created' },
  { value: 'item_updated', label: 'Item Updated' },
  { value: 'item_deleted', label: 'Item Deleted' },
  { value: 'field_changed', label: 'Field Changed' },
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'comment_added', label: 'Comment Added' },
  { value: 'due_soon', label: 'Due Soon' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'scheduled', label: 'Scheduled (CRON)' },
  { value: 'webhook', label: 'External Webhook' },
  { value: 'manual', label: 'Manual Trigger' },
];

const CONDITION_TYPES = [
  { value: 'field_equals', label: 'Field Equals' },
  { value: 'field_contains', label: 'Field Contains' },
  { value: 'field_greater_than', label: 'Field Greater Than' },
  { value: 'field_less_than', label: 'Field Less Than' },
  { value: 'user_role', label: 'User Has Role' },
  { value: 'opql_query', label: 'OPQL Query' },
  { value: 'custom_expression', label: 'Custom Expression' },
];

const ACTION_TYPES = [
  { value: 'set_field', label: 'Set Field Value' },
  { value: 'assign_user', label: 'Assign User' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'create_item', label: 'Create Item' },
  { value: 'create_comment', label: 'Create Comment' },
  { value: 'add_to_sprint', label: 'Add to Sprint' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'webhook_post', label: 'Webhook POST' },
  { value: 'run_script', label: 'Run Script' },
  { value: 'wait', label: 'Wait / Delay' },
];

export function AutomationBuilder({ projectId, automationId, onSave }: AutomationBuilderProps) {
  const { toast } = useToast();
  const [automationName, setAutomationName] = useState("New Automation");
  const [automationDescription, setAutomationDescription] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [trigger, setTrigger] = useState<TriggerBlock | null>(null);
  const [conditions, setConditions] = useState<ConditionBlock[]>([]);
  const [actions, setActions] = useState<ActionBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const addTrigger = (type: string) => {
    setTrigger({
      id: `trigger-${Date.now()}`,
      type,
      config: {},
    });
  };

  const addCondition = () => {
    const newCondition: ConditionBlock = {
      id: `condition-${Date.now()}`,
      type: 'field_equals',
      operator: 'AND',
      config: {},
    };
    setConditions([...conditions, newCondition]);
  };

  const addAction = (type: string = 'set_field') => {
    const newAction: ActionBlock = {
      id: `action-${Date.now()}`,
      type,
      config: {},
    };
    setActions([...actions, newAction]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const removeAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const saveAutomation = async () => {
    if (!trigger) {
      toast({ title: "Error", description: "Please add a trigger", variant: "destructive" });
      return;
    }

    try {
      const canvasData = { trigger, conditions, actions };

      if (automationId) {
        // Update existing
        const { error } = await supabase
          .from('automation_definitions')
          .update({
            name: automationName,
            description: automationDescription,
            is_enabled: isEnabled,
            canvas_data: canvasData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', automationId);

        if (error) throw error;
      } else {
        // Create new
        const { data: newAutomation, error: automationError } = await supabase
          .from('automation_definitions')
          .insert({
            project_id: projectId,
            name: automationName,
            description: automationDescription,
            is_enabled: isEnabled,
            canvas_data: canvasData,
          })
          .select()
          .single();

        if (automationError) throw automationError;

        // Save trigger
        await supabase.from('automation_triggers').insert({
          automation_id: newAutomation.id,
          trigger_type: trigger.type,
          config: trigger.config,
        });

        // Save conditions
        for (const [index, condition] of conditions.entries()) {
          await supabase.from('automation_conditions').insert({
            automation_id: newAutomation.id,
            condition_type: condition.type,
            config: condition.config,
            logic_operator: condition.operator,
            position: index,
          });
        }

        // Save actions
        for (const [index, action] of actions.entries()) {
          await supabase.from('automation_actions').insert({
            automation_id: newAutomation.id,
            action_type: action.type,
            config: action.config,
            position: index,
            branch_id: action.branchId,
          });
        }

        onSave?.(newAutomation.id);
      }

      toast({ title: "Success", description: "Automation saved successfully" });
    } catch (error) {
      console.error("Failed to save automation:", error);
      toast({ title: "Error", description: "Failed to save automation", variant: "destructive" });
    }
  };

  const testAutomation = () => {
    toast({ title: "Test Mode", description: "Testing automation with sample data..." });
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border bg-background p-4">
        <Input
          value={automationName}
          onChange={(e) => setAutomationName(e.target.value)}
          className="max-w-xs"
          placeholder="Automation name"
        />
        <div className="flex items-center gap-2">
          <Label>Enabled</Label>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="h-4 w-4"
          />
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={testAutomation}>
          <Play className="mr-2 h-4 w-4" />
          Test
        </Button>
        <Button variant="default" size="sm" onClick={saveAutomation}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30 p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Trigger Section */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">When (Trigger)</h3>
                {!trigger && (
                  <Select onValueChange={addTrigger}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {trigger && (
                <div
                  className={cn(
                    "rounded-lg border-2 p-4 transition-all",
                    selectedBlock === trigger.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                  onClick={() => setSelectedBlock(trigger.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {TRIGGER_TYPES.find(t => t.value === trigger.type)?.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Object.keys(trigger.config).length} configuration(s)
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTrigger(null)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Conditions Section */}
            {trigger && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">If (Conditions)</h3>
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Condition
                  </Button>
                </div>
                {conditions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No conditions - automation will always run</p>
                ) : (
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={condition.id}>
                        {index > 0 && (
                          <div className="my-2 flex items-center justify-center">
                            <Select
                              value={condition.operator}
                              onValueChange={(value: any) =>
                                setConditions(conditions.map(c =>
                                  c.id === condition.id ? { ...c, operator: value } : c
                                ))
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                                <SelectItem value="NOT">NOT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-lg border-2 p-4 transition-all",
                            selectedBlock === condition.id ? "border-primary bg-primary/5" : "border-border"
                          )}
                          onClick={() => setSelectedBlock(condition.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <Select
                                value={condition.type}
                                onValueChange={(value) =>
                                  setConditions(conditions.map(c =>
                                    c.id === condition.id ? { ...c, type: value } : c
                                  ))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONDITION_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeCondition(condition.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Actions Section */}
            {trigger && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Then (Actions)</h3>
                  <Select onValueChange={addAction}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Add action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actions configured</p>
                ) : (
                  <div className="space-y-3">
                    {actions.map((action, index) => (
                      <div key={action.id}>
                        {index > 0 && <div className="my-2 text-center text-xs text-muted-foreground">then</div>}
                        <div
                          className={cn(
                            "rounded-lg border-2 p-4 transition-all",
                            selectedBlock === action.id ? "border-primary bg-primary/5" : "border-border"
                          )}
                          onClick={() => setSelectedBlock(action.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <Select
                                value={action.type}
                                onValueChange={(value) =>
                                  setActions(actions.map(a =>
                                    a.id === action.id ? { ...a, type: value } : a
                                  ))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => {
                                const newAction = { ...action, id: `action-${Date.now()}` };
                                setActions([...actions.slice(0, index + 1), newAction, ...actions.slice(index + 1)]);
                              }}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => removeAction(action.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-80 border-l border-border bg-background">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Configuration</h3>
                {selectedBlock ? (
                  <p className="text-sm text-muted-foreground">
                    Configure the selected block's properties here
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a trigger, condition, or action to configure
                  </p>
                )}
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
