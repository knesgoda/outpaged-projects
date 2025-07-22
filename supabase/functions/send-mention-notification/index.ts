import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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

    // Get mentioned users' details
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email:users!inner(email)')
      .in('user_id', mentions);

    if (usersError) {
      console.error("Error fetching user details:", usersError);
      throw usersError;
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

    // Send emails to mentioned users
    const emailPromises = users.map(async (user: any) => {
      const userEmail = user.email?.email;
      if (!userEmail) {
        console.log(`No email found for user ${user.user_id}`);
        return;
      }

      const projectName = task.projects?.name || 'Unknown Project';
      const taskTitle = task.title || 'Untitled Task';

      try {
        const emailResponse = await resend.emails.send({
          from: "TaskFlow <notifications@resend.dev>",
          to: [userEmail],
          subject: `You were mentioned in a comment - ${taskTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; margin-bottom: 20px;">You were mentioned in a comment</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; color: #555;">
                  <strong>${mentionedBy}</strong> mentioned you in a comment on:
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

        console.log(`Email sent successfully to ${userEmail}:`, emailResponse);
        return emailResponse;
      } catch (emailError) {
        console.error(`Error sending email to ${userEmail}:`, emailError);
        throw emailError;
      }
    });

    await Promise.all(emailPromises);

    console.log("All mention notification emails sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notifications sent to ${mentions.length} users` 
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