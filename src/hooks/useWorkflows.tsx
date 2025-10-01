import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'design' | 'software' | 'marketing' | 'operations' | 'custom';
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowState {
  id: string;
  workflow_template_id: string;
  name: string;
  description?: string;
  state_category: 'draft' | 'todo' | 'in_progress' | 'in_review' | 'on_hold' | 'done';
  position: number;
  color: string;
  required_fields: string[];
  requires_approval: boolean;
  approval_roles: string[];
  created_at: string;
}

export interface WorkflowTransition {
  id: string;
  workflow_template_id: string;
  from_state_id: string;
  to_state_id: string;
  conditions: Record<string, any>;
  post_actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  created_at: string;
}

export interface ProjectWorkflow {
  id: string;
  project_id: string;
  workflow_template_id: string;
  item_type: string;
  is_active: boolean;
  created_at: string;
}

export const useWorkflows = (projectId?: string) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [states, setStates] = useState<WorkflowState[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchWorkflowTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setTemplates((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching workflow templates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workflow templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowStates = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("workflow_states")
        .select("*")
        .eq("workflow_template_id", templateId)
        .order("position");

      if (error) throw error;
      setStates((data as any) || []);
      return data || [];
    } catch (error: any) {
      console.error("Error fetching workflow states:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workflow states",
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchWorkflowTransitions = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("workflow_transitions")
        .select("*")
        .eq("workflow_template_id", templateId);

      if (error) throw error;
      setTransitions((data as any) || []);
      return data || [];
    } catch (error: any) {
      console.error("Error fetching workflow transitions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workflow transitions",
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchProjectWorkflows = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("project_workflows")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true);

      if (error) throw error;
      setProjectWorkflows(data || []);
    } catch (error: any) {
      console.error("Error fetching project workflows:", error);
      toast({
        title: "Error",
        description: "Failed to fetch project workflows",
        variant: "destructive",
      });
    }
  };

  const createWorkflowTemplate = async (template: Partial<WorkflowTemplate>) => {
    try {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("workflow_templates")
        .insert({
          name: template.name,
          description: template.description,
          category: template.category,
          is_default: template.is_default,
          is_active: template.is_active,
          created_by: user.data.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workflow template created successfully",
      });

      await fetchWorkflowTemplates();
      return data;
    } catch (error: any) {
      console.error("Error creating workflow template:", error);
      toast({
        title: "Error",
        description: "Failed to create workflow template",
        variant: "destructive",
      });
    }
  };

  const createWorkflowState = async (state: Omit<WorkflowState, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from("workflow_states")
        .insert(state)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workflow state created successfully",
      });

      return data;
    } catch (error: any) {
      console.error("Error creating workflow state:", error);
      toast({
        title: "Error",
        description: "Failed to create workflow state",
        variant: "destructive",
      });
    }
  };

  const createWorkflowTransition = async (transition: Omit<WorkflowTransition, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from("workflow_transitions")
        .insert(transition)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workflow transition created successfully",
      });

      return data;
    } catch (error: any) {
      console.error("Error creating workflow transition:", error);
      toast({
        title: "Error",
        description: "Failed to create workflow transition",
        variant: "destructive",
      });
    }
  };

  const assignWorkflowToProject = async (
    projectId: string,
    templateId: string,
    itemType: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("project_workflows")
        .insert({
          project_id: projectId,
          workflow_template_id: templateId,
          item_type: itemType,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workflow assigned to project successfully",
      });

      if (projectId) {
        await fetchProjectWorkflows(projectId);
      }
      return data;
    } catch (error: any) {
      console.error("Error assigning workflow:", error);
      toast({
        title: "Error",
        description: "Failed to assign workflow to project",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWorkflowTemplates();
    if (projectId) {
      fetchProjectWorkflows(projectId);
    }
  }, [projectId]);

  return {
    templates,
    states,
    transitions,
    projectWorkflows,
    loading,
    fetchWorkflowTemplates,
    fetchWorkflowStates,
    fetchWorkflowTransitions,
    fetchProjectWorkflows,
    createWorkflowTemplate,
    createWorkflowState,
    createWorkflowTransition,
    assignWorkflowToProject,
  };
};
