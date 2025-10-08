import { supabase } from "@/integrations/supabase/client";
import type { Subscription } from "@/types";

type EntityRef = { type: Subscription["entity_type"]; id: string };

export async function listSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await (supabase
    .from("notification_subscriptions") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load subscriptions");
  }

  return (data ?? []) as Subscription[];
}

export async function toggleSubscription(entity: EntityRef): Promise<boolean> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "Failed to resolve current user");
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: existing, error: fetchError } = await (supabase
    .from("notification_subscriptions") as any)
    .select("id")
    .eq("user_id", user.id)
    .eq("entity_type", entity.type)
    .eq("entity_id", entity.id)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    throw new Error(fetchError.message || "Failed to check subscription");
  }

  if (existing) {
    const { error } = await (supabase
      .from("notification_subscriptions") as any)
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message || "Failed to unfollow");
    }

    return false;
  }

  const { error: insertError } = await (supabase
    .from("notification_subscriptions") as any)
    .insert({
      user_id: user.id,
      entity_type: entity.type,
      entity_id: entity.id,
    });

  if (insertError) {
    throw new Error(insertError.message || "Failed to follow");
  }

  return true;
}
