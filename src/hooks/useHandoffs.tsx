import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Handoff {
  id: string;
  source_item_id: string;
  target_item_id: string;
  from_team: string;
  to_team: string;
  handoff_type: string;
  exit_criteria: Record<string, any>;
  acceptance_checklist: Array<{
    item: string;
    completed: boolean;
    required: boolean;
  }>;
  status: 'pending' | 'accepted' | 'rejected';
  context_data: Record<string, any>;
  created_by?: string;
  accepted_by?: string;
  created_at: string;
  accepted_at?: string;
}

interface CreateHandoffData {
  source_item_id: string;
  target_item_id?: string;
  from_team: string;
  to_team: string;
  handoff_type: string;
  exit_criteria?: Record<string, any>;
  acceptance_checklist?: Array<{
    item: string;
    completed: boolean;
    required: boolean;
  }>;
  context_data?: Record<string, any>;
}

export const useHandoffs = (taskId?: string) => {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHandoffs = async (taskId?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from("handoffs")
        .select("*")
        .order("created_at", { ascending: false });

      if (taskId) {
        query = query.or(`source_item_id.eq.${taskId},target_item_id.eq.${taskId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHandoffs((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching handoffs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch handoffs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createHandoff = async (handoffData: CreateHandoffData) => {
    try {
      const user = await supabase.auth.getUser();
      
      // If target_item_id is not provided, create a new task
      let targetItemId = handoffData.target_item_id;
      
      if (!targetItemId) {
        // Get source task details
        const { data: sourceTask, error: sourceError } = await supabase
          .from("tasks")
          .select("*, projects(*)")
          .eq("id", handoffData.source_item_id)
          .single();

        if (sourceError) throw sourceError;

        // Create target task
        const { data: targetTask, error: targetError } = await supabase
          .from("tasks")
          .insert({
            project_id: sourceTask.project_id,
            title: `[Handoff] ${sourceTask.title}`,
            description: `Handoff from ${handoffData.from_team}: ${sourceTask.description || ''}`,
            status: 'todo',
            reporter_id: user.data.user?.id,
          })
          .select()
          .single();

        if (targetError) throw targetError;
        targetItemId = targetTask.id;
      }

      const { error } = await supabase.from("handoffs").insert({
        ...handoffData,
        target_item_id: targetItemId,
        created_by: user.data.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Handoff created successfully",
      });

      await fetchHandoffs(taskId);
    } catch (error: any) {
      console.error("Error creating handoff:", error);
      toast({
        title: "Error",
        description: "Failed to create handoff",
        variant: "destructive",
      });
    }
  };

  const acceptHandoff = async (handoffId: string) => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from("handoffs")
        .update({
          status: 'accepted',
          accepted_by: user.data.user?.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", handoffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Handoff accepted successfully",
      });

      await fetchHandoffs(taskId);
    } catch (error: any) {
      console.error("Error accepting handoff:", error);
      toast({
        title: "Error",
        description: "Failed to accept handoff",
        variant: "destructive",
      });
    }
  };

  const rejectHandoff = async (handoffId: string) => {
    try {
      const user = await supabase.auth.getUser();
      const { error } = await supabase
        .from("handoffs")
        .update({
          status: 'rejected',
          accepted_by: user.data.user?.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", handoffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Handoff rejected",
      });

      await fetchHandoffs(taskId);
    } catch (error: any) {
      console.error("Error rejecting handoff:", error);
      toast({
        title: "Error",
        description: "Failed to reject handoff",
        variant: "destructive",
      });
    }
  };

  const updateChecklistItem = async (
    handoffId: string,
    itemIndex: number,
    completed: boolean
  ) => {
    try {
      // Get current handoff
      const { data: handoff } = await supabase
        .from("handoffs")
        .select("acceptance_checklist")
        .eq("id", handoffId)
        .single();

      if (!handoff) throw new Error("Handoff not found");

      // Update checklist
      const updatedChecklist = [...(handoff.acceptance_checklist as any[])];
      updatedChecklist[itemIndex] = {
        ...updatedChecklist[itemIndex],
        completed,
      };

      const { error } = await supabase
        .from("handoffs")
        .update({ acceptance_checklist: updatedChecklist })
        .eq("id", handoffId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Checklist item updated",
      });

      await fetchHandoffs(taskId);
    } catch (error: any) {
      console.error("Error updating checklist:", error);
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchHandoffs(taskId);
    }
  }, [taskId]);

  return {
    handoffs,
    loading,
    fetchHandoffs,
    createHandoff,
    acceptHandoff,
    rejectHandoff,
    updateChecklistItem,
  };
};
