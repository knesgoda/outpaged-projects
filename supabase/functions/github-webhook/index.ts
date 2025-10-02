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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    const event = req.headers.get('X-GitHub-Event');

    console.log('GitHub webhook received:', event, payload);

    // Handle different GitHub events
    switch (event) {
      case 'push':
        await handlePushEvent(supabaseClient, payload);
        break;
      case 'pull_request':
        await handlePullRequestEvent(supabaseClient, payload);
        break;
      case 'issues':
        await handleIssueEvent(supabaseClient, payload);
        break;
      case 'commit_comment':
        await handleCommitCommentEvent(supabaseClient, payload);
        break;
      default:
        console.log('Unhandled event type:', event);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handlePushEvent(supabase: any, payload: any) {
  // Extract commit messages and look for task references (e.g., #OP-123)
  const commits = payload.commits || [];
  
  for (const commit of commits) {
    const taskRefs = commit.message.match(/#([A-Z]+-\d+)/g);
    
    if (taskRefs) {
      for (const ref of taskRefs) {
        const ticketNumber = ref.substring(1); // Remove #
        
        // Find task by ticket number and add commit as comment
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, project_id')
          .ilike('title', `%${ticketNumber}%`)
          .limit(1);
        
        if (tasks && tasks.length > 0) {
          const task = tasks[0];
          
          // Add commit as comment
          await supabase.from('comments').insert({
            task_id: task.id,
            author_id: payload.sender.id,
            content: `Commit: ${commit.message}\n\nSHA: ${commit.id}\nURL: ${commit.url}`
          });
          
          console.log(`Linked commit ${commit.id} to task ${task.id}`);
        }
      }
    }
  }
}

async function handlePullRequestEvent(supabase: any, payload: any) {
  const pr = payload.pull_request;
  const action = payload.action;
  
  // Extract task references from PR title or body
  const text = `${pr.title} ${pr.body}`;
  const taskRefs = text.match(/#([A-Z]+-\d+)/g);
  
  if (taskRefs) {
    for (const ref of taskRefs) {
      const ticketNumber = ref.substring(1);
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status')
        .ilike('title', `%${ticketNumber}%`)
        .limit(1);
      
      if (tasks && tasks.length > 0) {
        const task = tasks[0];
        
        // Update task status based on PR state
        let newStatus = task.status;
        if (action === 'opened') {
          newStatus = 'in_progress';
        } else if (action === 'closed' && pr.merged) {
          newStatus = 'in_review';
        }
        
        await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', task.id);
        
        // Add PR as comment
        await supabase.from('comments').insert({
          task_id: task.id,
          author_id: payload.sender.id,
          content: `Pull Request ${action}: ${pr.title}\n\nURL: ${pr.html_url}\nState: ${pr.state}`
        });
        
        console.log(`Updated task ${task.id} based on PR ${pr.number}`);
      }
    }
  }
}

async function handleIssueEvent(supabase: any, payload: any) {
  const issue = payload.issue;
  const action = payload.action;
  
  // Sync GitHub issues to tasks
  if (action === 'opened') {
    // Create new task from issue
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .single();
    
    if (project) {
      await supabase.from('tasks').insert({
        title: `GH-${issue.number}: ${issue.title}`,
        description: issue.body,
        project_id: project.id,
        task_type: 'bug',
        status: 'todo',
        reporter_id: payload.sender.id
      });
      
      console.log(`Created task from issue ${issue.number}`);
    }
  }
}

async function handleCommitCommentEvent(supabase: any, payload: any) {
  const comment = payload.comment;
  
  // Add commit comments to related tasks
  const taskRefs = comment.body.match(/#([A-Z]+-\d+)/g);
  
  if (taskRefs) {
    for (const ref of taskRefs) {
      const ticketNumber = ref.substring(1);
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .ilike('title', `%${ticketNumber}%`)
        .limit(1);
      
      if (tasks && tasks.length > 0) {
        await supabase.from('comments').insert({
          task_id: tasks[0].id,
          author_id: payload.sender.id,
          content: `GitHub Comment: ${comment.body}\n\nCommit: ${comment.commit_id}`
        });
      }
    }
  }
}
