import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TaskUpdateRequest {
  taskId: string;
  updatedBy: string;
  updateType: 'status_change' | 'comment_added' | 'due_date_changed' | 'priority_changed';
  details: {
    oldValue?: string;
    newValue?: string;
    comment?: string;
  };
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

    const { taskId, updatedBy, updateType, details }: TaskUpdateRequest = await req.json();

    console.log("Processing task update notification for:", { taskId, updatedBy, updateType });

    // Get task details and assignees
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        title, 
        description, 
        status, 
        priority,
        project_id,
        projects!inner(name),
        task_assignees!inner(
          user_id,
          profiles!inner(full_name, users!inner(email))
        )
      `)
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task details:", taskError);
      throw taskError;
    }

    // Get updater details
    const { data: updater, error: updaterError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', updatedBy)
      .single();

    if (updaterError) {
      console.error("Error fetching updater details:", updaterError);
      throw updaterError;
    }

    const taskTitle = task.title || 'Untitled Task';
    const projectName = task.projects?.name || 'Unknown Project';
    const updaterName = updater?.full_name || 'Someone';

    // Get notification recipients (task assignees, excluding the person who made the update)
    const recipients = task.task_assignees
      ?.filter((assignee: any) => assignee.user_id !== updatedBy)
      ?.map((assignee: any) => ({
        email: assignee.profiles?.users?.email,
        name: assignee.profiles?.full_name,
        userId: assignee.user_id
      }))
      ?.filter((recipient: any) => recipient.email);

    if (!recipients || recipients.length === 0) {
      console.log("No email recipients found for task update notification");
      return new Response(JSON.stringify({ success: true, message: "No recipients to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate update message based on type
    let updateMessage = '';
    let emailSubject = '';
    
    switch (updateType) {
      case 'status_change':
        updateMessage = `changed the status from <strong>${details.oldValue}</strong> to <strong>${details.newValue}</strong>`;
        emailSubject = `Task Status Updated: ${taskTitle}`;
        break;
      case 'comment_added':
        updateMessage = `added a new comment`;
        emailSubject = `New Comment: ${taskTitle}`;
        break;
      case 'due_date_changed':
        const oldDate = details.oldValue ? new Date(details.oldValue).toLocaleDateString() : 'None';
        const newDate = details.newValue ? new Date(details.newValue).toLocaleDateString() : 'None';
        updateMessage = `changed the due date from <strong>${oldDate}</strong> to <strong>${newDate}</strong>`;
        emailSubject = `Due Date Updated: ${taskTitle}`;
        break;
      case 'priority_changed':
        updateMessage = `changed the priority from <strong>${details.oldValue}</strong> to <strong>${details.newValue}</strong>`;
        emailSubject = `Priority Updated: ${taskTitle}`;
        break;
      default:
        updateMessage = 'made an update';
        emailSubject = `Task Updated: ${taskTitle}`;
    }

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient: any) => {
      try {
        const emailResponse = await resend.emails.send({
          from: "TaskFlow <notifications@resend.dev>",
          to: [recipient.email],
          subject: emailSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
              <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px;">Task Update Notification</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 18px;">${taskTitle}</h3>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">in project <strong>${projectName}</strong></p>
                </div>
                
                <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                  <p style="margin: 0; color: #1e40af; line-height: 1.5;">
                    <strong>${updaterName}</strong> ${updateMessage}
                  </p>
                  ${details.comment ? `<div style="background: white; padding: 12px; border-radius: 4px; margin-top: 10px; border: 1px solid #e5e7eb;"><p style="margin: 0; color: #374151; font-style: italic;">"${details.comment}"</p></div>` : ''}
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/dashboard/tasks/${taskId}" 
                     style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                    View Task Details
                  </a>
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 25px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
                    You're receiving this because you're assigned to this task.<br>
                    <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/settings" style="color: #3b82f6;">Manage your notification preferences</a>
                  </p>
                </div>
              </div>
            </div>
          `,
        });

        console.log(`Task update email sent successfully to ${recipient.email}:`, emailResponse);
        
        // Create in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: recipient.userId,
            title: 'Task Updated',
            message: `${updaterName} ${updateMessage.replace(/<\/?strong>/g, '')}`,
            type: 'info',
            related_task_id: taskId,
            related_project_id: task.project_id,
          });

        return emailResponse;
      } catch (emailError) {
        console.error(`Error sending email to ${recipient.email}:`, emailError);
        throw emailError;
      }
    });

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Task update notifications sent to ${recipients.length} recipients` 
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
    console.error("Error in send-task-update-notification function:", error);
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