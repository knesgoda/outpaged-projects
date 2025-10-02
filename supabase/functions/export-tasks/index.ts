import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, format = 'csv' } = await req.json();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all tasks for the project
    const { data: tasks, error } = await supabaseClient
      .from('tasks')
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(full_name, email),
        reporter:profiles!tasks_reporter_id_fkey(full_name, email),
        project:projects(name)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`Exporting ${tasks?.length || 0} tasks`);

    let exportData: string;
    let contentType: string;

    switch (format.toLowerCase()) {
      case 'json':
        exportData = JSON.stringify(tasks, null, 2);
        contentType = 'application/json';
        break;

      case 'csv':
        // Convert to CSV
        if (!tasks || tasks.length === 0) {
          exportData = 'No tasks to export';
        } else {
          const headers = [
            'ID',
            'Ticket Number',
            'Title',
            'Description',
            'Type',
            'Status',
            'Priority',
            'Story Points',
            'Assignee',
            'Reporter',
            'Created At',
            'Updated At',
            'Due Date'
          ];

          const rows = tasks.map(task => [
            task.id,
            task.ticket_number || '',
            task.title,
            (task.description || '').replace(/"/g, '""').replace(/\n/g, ' '),
            task.task_type,
            task.status,
            task.priority,
            task.story_points || '',
            task.assignee?.full_name || '',
            task.reporter?.full_name || '',
            task.created_at,
            task.updated_at,
            task.due_date || ''
          ]);

          exportData = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
          ].join('\n');
        }
        contentType = 'text/csv';
        break;

      case 'markdown':
        // Convert to Markdown table
        if (!tasks || tasks.length === 0) {
          exportData = '# No tasks to export';
        } else {
          const header = '| Ticket | Title | Type | Status | Priority | Assignee |';
          const separator = '|--------|-------|------|--------|----------|----------|';
          const rows = tasks.map(task => 
            `| ${task.ticket_number || task.id.substring(0, 8)} | ${task.title} | ${task.task_type} | ${task.status} | ${task.priority} | ${task.assignee?.full_name || 'Unassigned'} |`
          );

          exportData = `# Task Export\n\nProject: ${tasks[0]?.project?.name || 'Unknown'}\n\nExported: ${new Date().toISOString()}\n\n${header}\n${separator}\n${rows.join('\n')}`;
        }
        contentType = 'text/markdown';
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return new Response(exportData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="tasks-export-${Date.now()}.${format}"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
