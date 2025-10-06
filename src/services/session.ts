import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";

export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (!error && data?.user?.id) {
    return data.user.id;
  }

  const fallback = getCurrentUser();
  if (fallback?.id) {
    return fallback.id;
  }

  throw new Error("You must be signed in to perform this action.");
}
