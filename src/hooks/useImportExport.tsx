import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ExportData {
  tasks?: any[];
  projects?: any[];
  timeEntries?: any[];
  sprints?: any[];
}

export interface ImportOptions {
  type: 'tasks' | 'projects' | 'timeEntries' | 'sprints';
  file: File;
  mapping?: Record<string, string>;
}

export function useImportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = async (data: any[], filename: string) => {
    try {
      setIsExporting(true);
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `${filename}.csv has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to CSV",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async (data: ExportData, filename: string) => {
    try {
      setIsExporting(true);
      const workbook = XLSX.utils.book_new();

      // Add sheets for each data type
      if (data.tasks && data.tasks.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data.tasks);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
      }

      if (data.projects && data.projects.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data.projects);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
      }

      if (data.timeEntries && data.timeEntries.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data.timeEntries);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Entries');
      }

      if (data.sprints && data.sprints.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data.sprints);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sprints');
      }

      XLSX.writeFile(workbook, `${filename}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `${filename}.xlsx has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllData = async () => {
    try {
      setIsExporting(true);
      
      const [tasksResponse, projectsResponse, timeEntriesResponse, sprintsResponse] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('time_entries').select('*'),
        supabase.from('sprints').select('*'),
      ]);

      const exportData: ExportData = {
        tasks: tasksResponse.data || [],
        projects: projectsResponse.data || [],
        timeEntries: timeEntriesResponse.data || [],
        sprints: sprintsResponse.data || [],
      };

      const timestamp = new Date().toISOString().split('T')[0];
      await exportToExcel(exportData, `projectflow-backup-${timestamp}`);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export all data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportTasks = async (projectId?: string) => {
    try {
      setIsExporting(true);
      
      let query = supabase
        .from('tasks')
        .select('*');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.project_id,
        assignee_id: task.assignee_id,
        reporter_id: task.reporter_id,
        story_points: task.story_points,
        due_date: task.due_date,
        created_at: task.created_at,
        updated_at: task.updated_at,
      })) || [];

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = projectId ? `tasks-${projectId}-${timestamp}` : `all-tasks-${timestamp}`;
      
      await exportToCSV(formattedData, filename);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export tasks",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportTimeEntries = async (startDate?: string, endDate?: string) => {
    try {
      setIsExporting(true);
      
      let query = supabase
        .from('time_entries')
        .select('*');

      if (startDate) {
        query = query.gte('started_at', startDate);
      }
      if (endDate) {
        query = query.lte('started_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(entry => ({
        id: entry.id,
        task_id: entry.task_id,
        user_id: entry.user_id,
        description: entry.description,
        started_at: entry.started_at,
        ended_at: entry.ended_at,
        duration_minutes: entry.duration_minutes,
        is_running: entry.is_running,
        created_at: entry.created_at,
      })) || [];

      const timestamp = new Date().toISOString().split('T')[0];
      await exportToCSV(formattedData, `time-entries-${timestamp}`);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export time entries",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importFromCSV = async (options: ImportOptions): Promise<boolean> => {
    try {
      setIsImporting(true);
      
      return new Promise((resolve) => {
        Papa.parse(options.file, {
          header: true,
          complete: async (results) => {
            try {
              const data = results.data as any[];
              
              if (data.length === 0) {
                toast({
                  title: "Import Failed",
                  description: "No data found in file",
                  variant: "destructive",
                });
                resolve(false);
                return;
              }

              // Process data based on type
              let processedData: any[] = [];
              
              switch (options.type) {
                case 'tasks':
                  processedData = data.map(row => ({
                    title: row.title || row.Title,
                    description: row.description || row.Description,
                    status: row.status || row.Status || 'todo',
                    priority: row.priority || row.Priority || 'medium',
                    story_points: parseInt(row.story_points || row['Story Points']) || null,
                    due_date: row.due_date || row['Due Date'] || null,
                  }));
                  break;
                case 'projects':
                  processedData = data.map(row => ({
                    name: row.name || row.Name,
                    description: row.description || row.Description,
                    status: row.status || row.Status || 'planning',
                    start_date: row.start_date || row['Start Date'] || null,
                    end_date: row.end_date || row['End Date'] || null,
                  }));
                  break;
                default:
                  toast({
                    title: "Import Failed",
                    description: "Unsupported import type",
                    variant: "destructive",
                  });
                  resolve(false);
                  return;
              }

              // Insert data into database
              const { error } = await supabase
                .from(options.type)
                .insert(processedData);

              if (error) throw error;

              toast({
                title: "Import Successful",
                description: `Imported ${processedData.length} ${options.type}`,
              });
              
              resolve(true);
            } catch (error) {
              toast({
                title: "Import Failed",
                description: "Failed to import data",
                variant: "destructive",
              });
              resolve(false);
            }
          },
          error: () => {
            toast({
              title: "Import Failed",
              description: "Failed to parse CSV file",
              variant: "destructive",
            });
            resolve(false);
          }
        });
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import data",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    exportToCSV,
    exportToExcel,
    exportAllData,
    exportTasks,
    exportTimeEntries,
    importFromCSV,
    isExporting,
    isImporting,
  };
}