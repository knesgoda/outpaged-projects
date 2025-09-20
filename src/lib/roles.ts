import { supabase } from "@/integrations/supabase/client";

export type UserRole =
  | "org_admin"
  | "space_admin"
  | "project_lead"
  | "contributor"
  | "requester"
  | "guest";

const LEGACY_ADMIN_EMAILS = ["kevin@outpaged.com", "carlos@outpaged.com"];

export async function getRoleForUser(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to load role for user", error.message);
    return null;
  }

  return (data?.role as UserRole | undefined) ?? null;
}

export function isLegacyAdmin(email: string | undefined | null) {
  if (!email) {
    return false;
  }

  return LEGACY_ADMIN_EMAILS.includes(email.toLowerCase());
}
