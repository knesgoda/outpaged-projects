import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  projectId: string;
  invitedBy: string;
  role?: string;
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

    const { email, projectId, invitedBy, role = 'developer' }: InvitationRequest = await req.json();

    console.log("Processing invitation notification for:", { email, projectId, invitedBy });

    // Get inviter details
    const { data: inviter, error: inviterError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', invitedBy)
      .single();

    if (inviterError) {
      console.error("Error fetching inviter details:", inviterError);
      throw inviterError;
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project details:", projectError);
      throw projectError;
    }

    const inviterName = inviter?.full_name || 'Someone';
    const projectName = project?.name || 'a project';

    const emailResponse = await resend.emails.send({
      from: "TaskFlow <notifications@resend.dev>",
      to: [email],
      subject: `You're invited to join ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
          <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #111827; margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
            </div>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px;">
                <strong>${inviterName}</strong> has invited you to collaborate on:
              </p>
              <h2 style="margin: 0; color: #1e293b; font-size: 20px;">${projectName}</h2>
              ${project?.description ? `<p style="margin: 10px 0 0 0; color: #64748b; line-height: 1.5;">${project.description}</p>` : ''}
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">What you'll be able to do:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #6b7280; line-height: 1.6;">
                <li>View and manage project tasks</li>
                <li>Collaborate with team members</li>
                <li>Track project progress</li>
                <li>Participate in discussions</li>
                ${role === 'admin' ? '<li><strong>Admin privileges:</strong> Manage project settings and members</li>' : ''}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/dashboard?project=${projectId}" 
                 style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);">
                Accept Invitation & Join Project
              </a>
            </div>
            
            <div style="text-align: center; margin-bottom: 25px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                New to TaskFlow? <a href="${Deno.env.get("SITE_URL") || "https://your-domain.com"}/auth" style="color: #3b82f6;">Create your account</a> to get started.
              </p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center; line-height: 1.5;">
                This invitation was sent by ${inviterName}. If you don't want to receive invitations, you can contact them directly.<br>
                TaskFlow - Project collaboration made simple.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`Invitation email sent successfully to ${email}:`, emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation sent to ${email}` 
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
    console.error("Error in send-invitation-notification function:", error);
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