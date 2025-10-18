import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OperationsTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  task_type: 'deployment' | 'maintenance' | 'configuration' | 'monitoring';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  sla_definition_id?: string;
  sla_response_due?: string;
  sla_resolution_due?: string;
  sla_breach_status?: 'ok' | 'warning' | 'breached';
  change_request_data?: any;
  vendor_dependencies?: string[];
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface OperationsContextType {
  tasks: OperationsTask[];
  createTask: (data: Partial<OperationsTask>) => Promise<void>;
  updateTask: (id: string, data: Partial<OperationsTask>) => Promise<void>;
  trackSLA: (taskId: string) => Promise<void>;
  addVendorDependency: (taskId: string, vendor: string) => Promise<void>;
  createChangeRequest: (taskId: string, changeData: any) => Promise<void>;
  loading: boolean;
  refetch: () => Promise<void>;
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<OperationsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('operations_tasks' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data as any) || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching operations tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async (data: Partial<OperationsTask>) => {
    try {
      const { error } = await supabase
        .from('operations_tasks' as any)
        .insert([data as any]);

      if (error) throw error;

      toast({
        title: 'Task created',
        description: 'Operations task created successfully',
      });

      await fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTask = async (id: string, data: Partial<OperationsTask>) => {
    try {
      const { error } = await supabase
        .from('operations_tasks' as any)
        .update(data as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Task updated',
        description: 'Operations task updated successfully',
      });

      await fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const trackSLA = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.sla_definition_id) return;

    try {
      const { data: slaDef, error } = await supabase
        .from('sla_definitions')
        .select('*')
        .eq('id', task.sla_definition_id)
        .single();

      if (error) throw error;

      const now = new Date();
      const createdAt = new Date(task.created_at);
      
      const responseDue = new Date(createdAt.getTime() + (slaDef as any).response_time_minutes * 60000);
      const resolutionDue = new Date(createdAt.getTime() + (slaDef as any).resolution_time_minutes * 60000);

      let breachStatus: 'ok' | 'warning' | 'breached' = 'ok';
      if (now > resolutionDue) {
        breachStatus = 'breached';
      } else if (now > responseDue) {
        breachStatus = 'warning';
      }

      await updateTask(taskId, {
        sla_response_due: responseDue.toISOString(),
        sla_resolution_due: resolutionDue.toISOString(),
        sla_breach_status: breachStatus,
      });
    } catch (error: any) {
      toast({
        title: 'Error tracking SLA',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addVendorDependency = async (taskId: string, vendor: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const vendors = task.vendor_dependencies || [];
    if (!vendors.includes(vendor)) {
      vendors.push(vendor);
      await updateTask(taskId, { vendor_dependencies: vendors });
    }
  };

  const createChangeRequest = async (taskId: string, changeData: any) => {
    await updateTask(taskId, { change_request_data: changeData });
  };

  return (
    <OperationsContext.Provider
      value={{
        tasks,
        createTask,
        updateTask,
        trackSLA,
        addVendorDependency,
        createChangeRequest,
        loading,
        refetch: fetchTasks,
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error('useOperations must be used within OperationsProvider');
  }
  return context;
}
