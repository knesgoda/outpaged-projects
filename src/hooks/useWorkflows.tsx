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
  validators: string[];
  transition_screen?: string | null;
  post_actions: Array<{
    type: string;
    config: Record<string, any>;
  }>;
  approvals: string[];
  created_at: string;
}

export interface WorkflowStateDraft {
  id: string;
  name: string;
  description?: string;
  state_category: WorkflowState['state_category'];
  color: string;
  required_fields: string[];
  requires_approval: boolean;
  approval_roles: string[];
  position?: { x: number; y: number };
}

export interface WorkflowTransitionDraft {
  id: string;
  from_state_id: string;
  to_state_id: string;
  validators: string[];
  transition_screen?: string | null;
  post_functions: string[];
  approvals: string[];
}

export interface WorkflowDefinitionDraft {
  states: WorkflowStateDraft[];
  transitions: WorkflowTransitionDraft[];
}

export interface WorkflowDraft {
  id: string;
  workflow_template_id: string;
  definition: WorkflowDefinitionDraft;
  version: number;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface WorkflowVersion {
  id: string;
  workflow_template_id: string;
  definition: WorkflowDefinitionDraft;
  version: number;
  published_at: string;
  published_by?: string;
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
  const [drafts, setDrafts] = useState<WorkflowDraft[]>([]);
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
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
        .select("id, workflow_template_id, from_state_id, to_state_id, conditions, validators, transition_screen, post_actions, approvals, created_at")
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
      const payload = {
        ...transition,
        validators: transition.validators ?? [],
        transition_screen: transition.transition_screen ?? null,
        post_actions: transition.post_actions ?? [],
        approvals: transition.approvals ?? [],
      };

      const { data, error } = await supabase
        .from("workflow_transitions")
        .insert(payload as any)
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

  const fetchWorkflowDrafts = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("workflow_drafts")
        .select("*")
        .eq("workflow_template_id", templateId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const parsedDrafts = (data as any[] | null)?.map((draft) => ({
        ...draft,
        definition: (draft.definition ?? {}) as WorkflowDefinitionDraft,
      })) ?? [];

      setDrafts(parsedDrafts as WorkflowDraft[]);
      return parsedDrafts as WorkflowDraft[];
    } catch (error: any) {
      console.error("Error fetching workflow drafts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workflow drafts",
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchWorkflowVersions = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("workflow_versions")
        .select("*")
        .eq("workflow_template_id", templateId)
        .order("version", { ascending: false });

      if (error) throw error;

      const parsedVersions = (data as any[] | null)?.map((version) => ({
        ...version,
        definition: (version.definition ?? {}) as WorkflowDefinitionDraft,
      })) ?? [];

      setVersions(parsedVersions as WorkflowVersion[]);
      return parsedVersions as WorkflowVersion[];
    } catch (error: any) {
      console.error("Error fetching workflow versions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch workflow versions",
        variant: "destructive",
      });
      return [];
    }
  };

  const saveWorkflowDraft = async (
    templateId: string,
    definition: WorkflowDefinitionDraft,
    options?: { draftId?: string }
  ) => {
    try {
      const payload: Record<string, any> = {
        workflow_template_id: templateId,
        definition,
      };

      if (options?.draftId) {
        payload.id = options.draftId;
      }

      const { data, error } = await supabase
        .from("workflow_drafts")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Draft saved",
        description: "Workflow draft saved successfully",
      });

      await fetchWorkflowDrafts(templateId);
      return data as WorkflowDraft;
    } catch (error: any) {
      console.error("Error saving workflow draft:", error);
      toast({
        title: "Error",
        description: "Failed to save workflow draft",
        variant: "destructive",
      });
    }
  };

  const publishWorkflowVersion = async (templateId: string, draftId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("workflow-publish", {
        body: { templateId, draftId },
      });

      if (error) throw error;

      toast({
        title: "Workflow published",
        description: "Draft promoted to an active workflow",
      });

      await Promise.all([
        fetchWorkflowStates(templateId),
        fetchWorkflowTransitions(templateId),
        fetchWorkflowDrafts(templateId),
        fetchWorkflowVersions(templateId),
      ]);

      return data as WorkflowVersion;
    } catch (error: any) {
      console.error("Error publishing workflow:", error);
      toast({
        title: "Error",
        description: "Failed to publish workflow",
        variant: "destructive",
      });
    }
  };

  const rollbackWorkflowVersion = async (templateId: string, versionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("workflow-rollback", {
        body: { templateId, versionId },
      });

      if (error) throw error;

      toast({
        title: "Workflow rolled back",
        description: "Workflow reverted to the selected version",
      });

      await Promise.all([
        fetchWorkflowStates(templateId),
        fetchWorkflowTransitions(templateId),
        fetchWorkflowDrafts(templateId),
        fetchWorkflowVersions(templateId),
      ]);

      return data as WorkflowVersion;
    } catch (error: any) {
      console.error("Error rolling back workflow version:", error);
      toast({
        title: "Error",
        description: "Failed to roll back workflow version",
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
    drafts,
    versions,
    projectWorkflows,
    loading,
    fetchWorkflowTemplates,
    fetchWorkflowStates,
    fetchWorkflowTransitions,
    fetchWorkflowDrafts,
    fetchWorkflowVersions,
    fetchProjectWorkflows,
    createWorkflowTemplate,
    createWorkflowState,
    createWorkflowTransition,
    saveWorkflowDraft,
    publishWorkflowVersion,
    rollbackWorkflowVersion,
    assignWorkflowToProject,
  };
};
