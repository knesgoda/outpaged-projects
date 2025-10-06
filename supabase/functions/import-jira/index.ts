import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      jiraUrl, 
      email, 
      apiToken, 
      projectKey,
      targetProjectId 
    } = await req.json();

    if (!jiraUrl || !email || !apiToken || !projectKey || !targetProjectId) {
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch Jira issues
    const authString = btoa(`${email}:${apiToken}`);
    const jiraApiUrl = `${jiraUrl}/rest/api/3/search?jql=project=${projectKey}&maxResults=100`;

    const jiraResponse = await fetch(jiraApiUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
      },
    });

    if (!jiraResponse.ok) {
      throw new Error(`Jira API error: ${jiraResponse.status}`);
    }

    const jiraData = await jiraResponse.json();
    const issues = jiraData.issues || [];

    console.log(`Found ${issues.length} issues to import`);

    // Map Jira issue types to task types
    const mapIssueType = (jiraType: string): string => {
      const typeMap: Record<string, string> = {
        'Story': 'story',
        'Task': 'task',
        'Bug': 'bug',
        'Epic': 'epic',
        'Subtask': 'subtask',
        'Sub-task': 'subtask',
      };
      return typeMap[jiraType] || 'task';
    };

    // Map Jira status to task status
    const mapStatus = (jiraStatus: string): string => {
      const status = jiraStatus.toLowerCase();
      if (status.includes('to do') || status.includes('backlog')) return 'todo';
      if (status.includes('in progress') || status.includes('doing')) return 'in_progress';
      if (status.includes('review') || status.includes('testing')) return 'in_review';
      if (status.includes('done') || status.includes('closed')) return 'done';
      return 'todo';
    };

    // Map Jira priority to task priority
    const mapPriority = (jiraPriority: string): string => {
      const priority = jiraPriority.toLowerCase();
      if (priority.includes('highest') || priority.includes('blocker')) return 'urgent';
      if (priority.includes('high')) return 'high';
      if (priority.includes('medium')) return 'medium';
      if (priority.includes('low') || priority.includes('lowest')) return 'low';
      return 'medium';
    };

    const importedTasks = [];
    const errors = [];

    // Get the current user as reporter
    const { data: { user } } = await supabaseClient.auth.getUser();
    const reporterId = user?.id;

    for (const issue of issues) {
      try {
        const fields = issue.fields;
        
        const taskData = {
          project_id: targetProjectId,
          title: `${issue.key}: ${fields.summary}`,
          description: fields.description?.content?.[0]?.content?.[0]?.text || fields.description || '',
          task_type: mapIssueType(fields.issuetype?.name || 'Task'),
          status: mapStatus(fields.status?.name || 'To Do'),
          priority: mapPriority(fields.priority?.name || 'Medium'),
          reporter_id: reporterId,
          story_points: fields.customfield_10016 || null, // Common story points field
          hierarchy_level: fields.issuetype?.name === 'Epic' ? 'epic' : 
                          fields.issuetype?.name === 'Story' ? 'story' : 
                          fields.issuetype?.name === 'Subtask' ? 'subtask' : 'task',
        };

        const { data: task, error } = await supabaseClient
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) {
          console.error(`Error importing ${issue.key}:`, error);
          errors.push({ issue: issue.key, error: error.message });
        } else {
          importedTasks.push(task);
          
          // Import comments if any
          if (fields.comment?.comments?.length > 0) {
            for (const comment of fields.comment.comments.slice(0, 10)) { // Limit to 10 comments
              await supabaseClient.from('comments').insert({
                task_id: task.id,
                author_id: reporterId,
                content: `Imported from Jira:\n${comment.body}`
              });
            }
          }
        }
      } catch (err: any) {
        console.error(`Error processing issue ${issue.key}:`, err);
        errors.push({ issue: issue.key, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: importedTasks.length,
        errors: errors.length,
        details: errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
