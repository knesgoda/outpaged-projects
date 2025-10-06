import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MentionNotificationRequest {
  mentions: string[];
  taskId: string;
  commentId: string;
  mentionedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { mentions, taskId, commentId, mentionedBy }: MentionNotificationRequest = await req.json();

    console.log("Processing mention notifications for:", { mentions, taskId, commentId, mentionedBy });

    // Get mentioned users' details using Auth Admin API to bypass RLS
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users from Auth API:", usersError);
      throw usersError;
    }

    // Filter to only mentioned users and get their profiles
    const mentionedUsers = users.filter(user => mentions.includes(user.id));
    
    if (mentionedUsers.length === 0) {
      console.log("No valid mentioned users found");
      return new Response(JSON.stringify({ success: true, message: "No valid users to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Get profile details for display names using service role
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', mentions);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    // Get task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('title, project_id, projects!inner(name)')
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error("Error fetching task details:", taskError);
      throw taskError;
    }

    // Create in-app notifications using service role to bypass RLS  
    const notifications = mentionedUsers.map(user => {
      const profile = profiles?.find(p => p.user_id === user.id);
      return {
        user_id: user.id,
        title: "You were mentioned in a comment",
        message: `${mentionedBy} mentioned you in a comment on task: ${task.title}`,
        type: 'info',
        related_task_id: taskId,
        created_at: new Date().toISOString()
      };
    });

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error("Error creating notifications:", notificationError);
    }

    // Send emails to mentioned users
    const emailPromises = mentionedUsers.map(async (user) => {
      if (!user.email) {
        console.log(`No email found for user ${user.id}`);
        return;
      }

      const profile = profiles?.find(p => p.user_id === user.id);
      const userName = profile?.full_name || user.email.split('@')[0];
      const projectName = task.projects?.name || 'Unknown Project';
      const taskTitle = task.title || 'Untitled Task';

      try {
        const emailResponse = await resend.emails.send({
          from: "TaskFlow <notifications@resend.dev>",
          to: [user.email],
          subject: `You were mentioned in a comment - ${taskTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; margin-bottom: 20px;">You were mentioned in a comment</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; color: #555;">
                  Hi ${userName}, <strong>${mentionedBy}</strong> mentioned you in a comment on:
                </p>
                <h3 style="margin: 10px 0; color: #333;">${taskTitle}</h3>
                <p style="margin: 0; color: #777;">in project <strong>${projectName}</strong></p>
              </div>
              
              <div style="margin: 20px 0;">
                <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/dashboard/tasks/${taskId}" 
                   style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Task & Comment
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                You're receiving this because you were mentioned in a comment. 
                <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/settings">Manage your notification preferences</a>
              </p>
            </div>
          `,
        });

        console.log(`Email sent successfully to ${user.email}:`, emailResponse);
        return emailResponse;
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
        throw emailError;
      }
    });

    await Promise.all(emailPromises);

    console.log("All mention notification emails sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notifications sent to ${mentionedUsers.length} users`,
        notified_users: mentionedUsers.length
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
    console.error("Error in send-mention-notification function:", error);
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