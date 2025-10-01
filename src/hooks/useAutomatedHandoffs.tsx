import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { findApplicableHandoffs, HandoffFlowConfig } from "@/lib/handoffConfig";

export const useAutomatedHandoffs = () => {
  const { toast } = useToast();

  const packageTaskAssets = async (taskId: string, config: HandoffFlowConfig) => {
    const contextData: any = {};

    try {
      // Get task details
      const { data: task } = await supabase
        .from("tasks")
        .select(`
          *,
          projects (id, name),
          profiles!tasks_reporter_id_fkey (full_name, avatar_url)
        `)
        .eq("id", taskId)
        .single();

      if (task) {
        contextData.task = {
          title: task.title,
          description: task.description,
          priority: task.priority,
          story_points: task.story_points,
        };
      }

      // Include attachments if configured
      if (config.assetPackaging.includeAttachments) {
        // Note: Attachments would be queried from storage if that table exists
        contextData.attachments_included = true;
      }

      // Include comments if configured
      if (config.assetPackaging.includeComments) {
        const { data: comments } = await supabase
          .from("comments")
          .select("content, created_at, author_id")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
          .limit(10);

        contextData.recent_comments = comments?.length || 0;
      }

      // Include related tasks if configured
      if (config.assetPackaging.includeRelatedTasks) {
        const { data: relationships } = await supabase
          .from("task_relationships")
          .select("*")
          .or(`source_task_id.eq.${taskId},target_task_id.eq.${taskId}`);

        contextData.related_tasks = relationships?.length || 0;
      }

      return contextData;
    } catch (error) {
      console.error("Error packaging assets:", error);
      return contextData;
    }
  };

  const createAutomatedHandoff = async (
    taskId: string,
    taskData: any,
    config: HandoffFlowConfig
  ) => {
    try {
      const user = await supabase.auth.getUser();
      
      // Package assets and context
      const contextData = await packageTaskAssets(taskId, config);

      // Create target task if configured
      let targetItemId = null;
      if (config.autoCreateTarget) {
        const { data: targetTask, error: targetError } = await supabase
          .from("tasks")
          .insert({
            project_id: taskData.project_id,
            title: `${config.targetTaskPrefix || "[Handoff]"} ${taskData.title}`,
            description: `Handoff from ${config.fromTeam}\n\n${taskData.description || ""}`,
            status: config.targetStatus as any,
            reporter_id: user.data.user?.id,
            parent_id: taskData.id, // Link as child for traceability
          })
          .select()
          .single();

        if (targetError) throw targetError;
        targetItemId = targetTask.id;

        // Create relationship
        await supabase.from("task_relationships").insert({
          source_task_id: taskId,
          target_task_id: targetItemId,
          relationship_type: "relates_to" as any,
          created_by: user.data.user?.id,
        });
      }

      // Create handoff record
      const { error: handoffError } = await supabase.from("handoffs").insert({
        source_item_id: taskId,
        target_item_id: targetItemId,
        from_team: config.fromTeam,
        to_team: config.toTeam,
        handoff_type: config.handoffType,
        exit_criteria: config.exitCriteria,
        acceptance_checklist: config.acceptanceChecklist.map((item) => ({
          item: item.item,
          required: item.required,
          completed: false,
        })),
        context_data: contextData,
        status: "pending",
        created_by: user.data.user?.id,
      });

      if (handoffError) throw handoffError;

      toast({
        title: "Handoff Created",
        description: `Automated handoff from ${config.fromTeam} to ${config.toTeam} created successfully`,
      });

      return { success: true, targetTaskId: targetItemId };
    } catch (error: any) {
      console.error("Error creating automated handoff:", error);
      toast({
        title: "Handoff Failed",
        description: error.message || "Failed to create automated handoff",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const triggerHandoffsForStatusChange = async (
    taskId: string,
    taskData: any,
    newStatus: string
  ) => {
    // Determine team from task project or other metadata
    const taskTeam = taskData.team || "Software"; // Default to Software if not specified
    
    // Find applicable handoff flows
    const applicableFlows = findApplicableHandoffs(taskTeam, newStatus);

    if (applicableFlows.length === 0) {
      return;
    }

    // Create handoffs for each applicable flow
    for (const flow of applicableFlows) {
      await createAutomatedHandoff(taskId, taskData, flow);
    }
  };

  return {
    triggerHandoffsForStatusChange,
    createAutomatedHandoff,
  };
};
