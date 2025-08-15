import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export type TaskRelationshipType = 
  | "blocks"
  | "depends_on"
  | "relates_to"
  | "duplicates"
  | "parent_child";

interface TaskRelationship {
  id: string;
  source_task_id: string;
  target_task_id: string;
  relationship_type: TaskRelationshipType;
  created_at: string;
  created_by: string;
  notes?: string;
  source_task_title?: string;
  target_task_title?: string;
  source_task_status?: string;
  target_task_status?: string;
}

interface CreateRelationshipData {
  source_task_id: string;
  target_task_id: string;
  relationship_type: TaskRelationshipType;
  notes?: string;
}

export const useTaskRelationships = (taskId?: string) => {
  const [relationships, setRelationships] = useState<TaskRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTaskRelationships = async (taskId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_task_relationships", {
        task_id_param: taskId,
      });

      if (error) throw error;
      setRelationships(data || []);
    } catch (error: any) {
      console.error("Error fetching task relationships:", error);
      toast({
        title: "Error",
        description: "Failed to fetch task relationships",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRelationship = async (relationshipData: CreateRelationshipData) => {
    try {
      const { error } = await supabase
        .from("task_relationships")
        .insert({
          ...relationshipData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task relationship created successfully",
      });

      if (taskId) {
        await fetchTaskRelationships(taskId);
      }
    } catch (error: any) {
      console.error("Error creating task relationship:", error);
      let errorMessage = "Failed to create task relationship";
      
      if (error.message?.includes("circular dependency")) {
        errorMessage = "Cannot create relationship: would create circular dependency";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const deleteRelationship = async (relationshipId: string) => {
    try {
      const { error } = await supabase
        .from("task_relationships")
        .delete()
        .eq("id", relationshipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task relationship deleted successfully",
      });

      if (taskId) {
        await fetchTaskRelationships(taskId);
      }
    } catch (error: any) {
      console.error("Error deleting task relationship:", error);
      toast({
        title: "Error",
        description: "Failed to delete task relationship",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskRelationships(taskId);
    }
  }, [taskId]);

  return {
    relationships,
    loading,
    fetchTaskRelationships,
    createRelationship,
    deleteRelationship,
  };
};