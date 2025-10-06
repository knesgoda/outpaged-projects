import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-github-event, x-github-delivery, x-hub-signature-256",
};

const resolveSupabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const event = req.headers.get("x-github-event") ?? "unknown";
  const deliveryId = req.headers.get("x-github-delivery") ?? "";

  try {
    // TODO: validate x-hub-signature-256 using GITHUB_WEBHOOK_SECRET once configured
    const payload = await req.json();
    const supabase = resolveSupabaseClient();

    await logWebhookEvent(supabase, {
      deliveryId,
      event,
      repo: payload?.repository?.full_name ?? null,
      payload,
    });

    if (event === "issues") {
      await handleIssueEvent(supabase, payload).catch((issueError) => {
        console.error("Issue handler failed", issueError);
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error", error);
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logWebhookEvent(supabase: any, params: {
  deliveryId: string;
  event: string;
  repo: string | null;
  payload: unknown;
}) {
  const { error } = await supabase.from("github_webhook_events").insert({
    delivery_id: params.deliveryId,
    event: params.event,
    repo_full_name: params.repo,
    payload: params.payload,
  });

  if (error) {
    console.error("Failed to store webhook event", error);
  }
}

async function handleIssueEvent(supabase: any, payload: any) {
  const issue = payload?.issue;
  if (!issue) {
    console.log("Missing issue payload");
    return;
  }

  const repoFullName: string | null = payload?.repository?.full_name ?? null;
  const match = findTaskTicket(issue);
  if (!match) {
    console.log("No task reference found in issue", issue.number);
    return;
  }

  const { ticketNumber } = match;
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("ticket_number", ticketNumber)
    .limit(1)
    .maybeSingle();

  if (taskError) {
    console.error("Failed to load task for issue", taskError);
    return;
  }

  if (!task) {
    console.log("No task found for ticket", ticketNumber);
    return;
  }

  const externalId = `${repoFullName ?? "repo"}#${issue.number}`;
  const metadata = {
    repo: repoFullName,
    number: issue.number,
    state: issue.state,
    action: payload?.action,
  };

  const { data: existing } = await supabase
    .from("linked_resources")
    .select("id")
    .eq("provider", "github")
    .eq("external_id", externalId)
    .eq("entity_id", task.id)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("linked_resources")
      .update({
        title: issue.title,
        url: issue.html_url,
        metadata,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Failed to update linked resource", updateError);
    }
    return;
  }

  const { error: insertError } = await supabase.from("linked_resources").insert({
    provider: "github",
    external_type: "issue",
    external_id: externalId,
    url: issue.html_url,
    title: issue.title,
    metadata,
    entity_type: "task",
    entity_id: task.id,
    project_id: task.project_id,
  });

  if (insertError) {
    console.error("Failed to insert linked resource", insertError);
  }
}

function findTaskTicket(issue: any): { ticketNumber: number } | null {
  const text = `${issue?.title ?? ""} ${issue?.body ?? ""}`;
  const match = text.match(/(?:OP|TASK|TICKET)-(\d+)/i);
  if (!match) {
    return null;
  }

  const ticketNumber = parseInt(match[1], 10);
  if (Number.isNaN(ticketNumber)) {
    return null;
  }

  return { ticketNumber };
}
