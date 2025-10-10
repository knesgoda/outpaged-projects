import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RefreshRequest = {
  startDate?: string;
  endDate?: string;
  dryRun?: boolean;
};

const parseDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date.toISOString().slice(0, 10);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json().catch(() => ({}))) as RefreshRequest;
    const startDate = parseDate(payload.startDate);
    const endDate = parseDate(payload.endDate);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (!payload.dryRun) {
      const { error } = await supabaseClient.rpc("analytics_refresh_rollups", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) {
        throw error;
      }
    }

    return new Response(
      JSON.stringify({
        status: payload.dryRun ? "dry-run" : "queued",
        startDate,
        endDate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("analytics-refresh", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
