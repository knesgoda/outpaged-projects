import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskAssignmentRequest {
  taskId: string;
  assigneeId: string;
  assignedBy: string;
  projectId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { taskId, assigneeId, assignedBy, projectId }: TaskAssignmentRequest = await req.json();

    console.log("Processing task assignment notification for:", { taskId, assigneeId, assignedBy });

    // Get assignee details
    const { data: assignee, error: assigneeError } = await supabase
      .from('profiles')
      .select('full_name, user_id, users!inner(email)')
      .eq('user_id', assigneeId)
      .single();

    if (assigneeError) {
      console.error("Error fetching assignee details:", assigneeError);
      throw assigneeError;
    }

    // Get assigner details
    const { data: assigner, error: assignerError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', assignedBy)
      .single();

    if (assignerError) {
      console.error("Error fetching assigner details:", assignerError);
      throw assignerError;
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, description, priority, due_date, projects!inner(name)')
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task details:", taskError);
      throw taskError;
    }

    const assigneeEmail = assignee.users?.email;
    if (!assigneeEmail) {
      console.log(`No email found for assignee ${assigneeId}`);
      return new Response(JSON.stringify({ success: false, message: "No email found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const projectName = task.projects?.name || 'Unknown Project';
    const taskTitle = task.title || 'Untitled Task';
    const assignerName = assigner?.full_name || 'Someone';
    const assigneeName = assignee?.full_name || 'there';

    const priorityColors = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };

    const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || '#6b7280';

    const emailResponse = await resend.emails.send({
      from: "TaskFlow <notifications@resend.dev>",
      to: [assigneeEmail],
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 24px;">You've been assigned a new task!</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 18px;">${taskTitle}</h3>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                  ${task.priority} Priority
                </span>
              </div>
              ${task.description ? `<p style="margin: 10px 0 0 0; color: #6b7280; line-height: 1.5;">${task.description}</p>` : ''}
              ${task.due_date ? `<p style="margin: 10px 0 0 0; color: #dc2626; font-weight: 600;">📅 Due: ${new Date(task.due_date).toLocaleDateString()}</p>` : ''}
            </div>
            
            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;">
                <strong>Assigned by:</strong> ${assignerName}<br>
                <strong>Project:</strong> ${projectName}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/dashboard/tasks/${taskId}" 
                 style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                View Task Details
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
                You're receiving this because you were assigned to a task in ${projectName}.<br>
                <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/settings" style="color: #3b82f6;">Manage your notification preferences</a>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`Task assignment email sent successfully to ${assigneeEmail}:`, emailResponse);

    // Create in-app notification
    await supabase
      .from('notifications')
      .insert({
        user_id: assigneeId,
        title: 'New Task Assignment',
        message: `${assignerName} assigned you to task: ${taskTitle}`,
        type: 'info',
        related_task_id: taskId,
        related_project_id: projectId,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Task assignment notification sent to ${assigneeName}` 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-task-assignment-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);