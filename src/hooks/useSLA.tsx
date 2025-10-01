import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SLADefinition {
  id: string;
  project_id: string;
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours_only: boolean;
  pause_states: string[];
  escalation_rules: Array<{
    level: number;
    after_minutes: number;
    notify: string[];
    action: string;
  }>;
  created_at: string;
}

export interface SLATracking {
  id: string;
  task_id: string;
  sla_definition_id: string;
  started_at: string;
  paused_at?: string;
  resumed_at?: string;
  breached_at?: string;
  resolved_at?: string;
  time_paused_minutes: number;
  status: 'active' | 'paused' | 'breached' | 'resolved';
  escalation_level: number;
  created_at: string;
}

export const useSLA = (projectId?: string) => {
  const [definitions, setDefinitions] = useState<SLADefinition[]>([]);
  const [tracking, setTracking] = useState<SLATracking[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSLADefinitions = async (projectId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sla_definitions")
        .select("*")
        .eq("project_id", projectId)
        .order("priority");

      if (error) throw error;
      setDefinitions((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching SLA definitions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch SLA definitions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSLATracking = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from("sla_tracking")
        .select("*")
        .eq("task_id", taskId);

      if (error) throw error;
      setTracking((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching SLA tracking:", error);
      toast({
        title: "Error",
        description: "Failed to fetch SLA tracking",
        variant: "destructive",
      });
    }
  };

  const createSLADefinition = async (definition: Omit<SLADefinition, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from("sla_definitions")
        .insert(definition)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "SLA definition created successfully",
      });

      if (projectId) {
        await fetchSLADefinitions(projectId);
      }
      return data;
    } catch (error: any) {
      console.error("Error creating SLA definition:", error);
      toast({
        title: "Error",
        description: "Failed to create SLA definition",
        variant: "destructive",
      });
    }
  };

  const startSLATracking = async (taskId: string, slaDefinitionId: string) => {
    try {
      const { data, error } = await supabase
        .from("sla_tracking")
        .insert({
          task_id: taskId,
          sla_definition_id: slaDefinitionId,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Error starting SLA tracking:", error);
      toast({
        title: "Error",
        description: "Failed to start SLA tracking",
        variant: "destructive",
      });
    }
  };

  const pauseSLATracking = async (trackingId: string) => {
    try {
      const { error } = await supabase
        .from("sla_tracking")
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
        })
        .eq("id", trackingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "SLA tracking paused",
      });
    } catch (error: any) {
      console.error("Error pausing SLA tracking:", error);
      toast({
        title: "Error",
        description: "Failed to pause SLA tracking",
        variant: "destructive",
      });
    }
  };

  const resumeSLATracking = async (trackingId: string) => {
    try {
      const { error } = await supabase
        .from("sla_tracking")
        .update({
          status: 'active',
          resumed_at: new Date().toISOString(),
        })
        .eq("id", trackingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "SLA tracking resumed",
      });
    } catch (error: any) {
      console.error("Error resuming SLA tracking:", error);
      toast({
        title: "Error",
        description: "Failed to resume SLA tracking",
        variant: "destructive",
      });
    }
  };

  const resolveSLATracking = async (trackingId: string) => {
    try {
      const { error } = await supabase
        .from("sla_tracking")
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq("id", trackingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "SLA tracking resolved",
      });
    } catch (error: any) {
      console.error("Error resolving SLA tracking:", error);
      toast({
        title: "Error",
        description: "Failed to resolve SLA tracking",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSLADefinitions(projectId);
    }
  }, [projectId]);

  return {
    definitions,
    tracking,
    loading,
    fetchSLADefinitions,
    fetchSLATracking,
    createSLADefinition,
    startSLATracking,
    pauseSLATracking,
    resumeSLATracking,
    resolveSLATracking,
  };
};
