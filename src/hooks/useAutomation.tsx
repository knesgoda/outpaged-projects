import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface AutomationRule {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  execution_count: number;
  last_executed_at?: string;
}

interface AutomationTrigger {
  id: string;
  rule_id: string;
  trigger_type: AutomationTriggerType;
  conditions: Json;
  created_at: string;
}

interface AutomationAction {
  id: string;
  rule_id: string;
  action_type: AutomationActionType;
  action_config: Json;
  execution_order: number;
  created_at: string;
}

interface CreateAutomationRuleData {
  project_id: string;
  name: string;
  description?: string;
  trigger: {
    trigger_type: AutomationTriggerType;
    conditions: Json;
  };
  actions: {
    action_type: AutomationActionType;
    action_config: Json;
    execution_order: number;
  }[];
}

export const useAutomation = (projectId?: string) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAutomationRules = async (projectId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error("Error fetching automation rules:", error);
      toast({
        title: "Error",
        description: "Failed to fetch automation rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRuleDetails = async (ruleId: string) => {
    try {
      const [triggersResponse, actionsResponse] = await Promise.all([
        supabase
          .from("automation_triggers")
          .select("*")
          .eq("rule_id", ruleId),
        supabase
          .from("automation_actions")
          .select("*")
          .eq("rule_id", ruleId)
          .order("execution_order"),
      ]);

      if (triggersResponse.error) throw triggersResponse.error;
      if (actionsResponse.error) throw actionsResponse.error;

      setTriggers(triggersResponse.data || []);
      setActions(actionsResponse.data || []);
    } catch (error: any) {
      console.error("Error fetching rule details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch rule details",
        variant: "destructive",
      });
    }
  };

  const createAutomationRule = async (ruleData: CreateAutomationRuleData) => {
    try {
      setLoading(true);

      // Create the rule
      const { data: rule, error: ruleError } = await supabase
        .from("automation_rules")
        .insert({
          project_id: ruleData.project_id,
          name: ruleData.name,
          description: ruleData.description,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (ruleError) throw ruleError;

      // Create the trigger
      const { error: triggerError } = await supabase
        .from("automation_triggers")
        .insert({
          rule_id: rule.id,
          trigger_type: ruleData.trigger.trigger_type,
          conditions: ruleData.trigger.conditions,
        });

      if (triggerError) throw triggerError;

      // Create the actions
      const actionsToInsert = ruleData.actions.map((action) => ({
        rule_id: rule.id,
        action_type: action.action_type,
        action_config: action.action_config,
        execution_order: action.execution_order,
      }));

      const { error: actionsError } = await supabase
        .from("automation_actions")
        .insert(actionsToInsert);

      if (actionsError) throw actionsError;

      toast({
        title: "Success",
        description: "Automation rule created successfully",
      });

      if (projectId) {
        await fetchAutomationRules(projectId);
      }

      return rule;
    } catch (error: any) {
      console.error("Error creating automation rule:", error);
      toast({
        title: "Error",
        description: "Failed to create automation rule",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAutomationRule = async (
    ruleId: string,
    updates: Partial<AutomationRule>
  ) => {
    try {
      const { error } = await supabase
        .from("automation_rules")
        .update(updates)
        .eq("id", ruleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation rule updated successfully",
      });

      if (projectId) {
        await fetchAutomationRules(projectId);
      }
    } catch (error: any) {
      console.error("Error updating automation rule:", error);
      toast({
        title: "Error",
        description: "Failed to update automation rule",
        variant: "destructive",
      });
    }
  };

  const deleteAutomationRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation rule deleted successfully",
      });

      if (projectId) {
        await fetchAutomationRules(projectId);
      }
    } catch (error: any) {
      console.error("Error deleting automation rule:", error);
      toast({
        title: "Error",
        description: "Failed to delete automation rule",
        variant: "destructive",
      });
    }
  };

  const executeAutomationRule = async (ruleId: string, taskId: string, triggerData: any = {}) => {
    try {
      const { data, error } = await supabase.rpc("execute_automation_rule", {
        rule_id_param: ruleId,
        task_id_param: taskId,
        trigger_data_param: triggerData,
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Success",
          description: "Automation rule executed successfully",
        });
      }

      return data;
    } catch (error: any) {
      console.error("Error executing automation rule:", error);
      toast({
        title: "Error",
        description: "Failed to execute automation rule",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAutomationRules(projectId);
    }
  }, [projectId]);

  return {
    rules,
    triggers,
    actions,
    loading,
    fetchAutomationRules,
    fetchRuleDetails,
    createAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
    executeAutomationRule,
  };
};