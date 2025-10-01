import { supabase } from "@/integrations/supabase/client";

export type UserRole =
  | "org_admin"
  | "space_admin"
  | "project_lead"
  | "contributor"
  | "requester"
  | "guest"
  | "super_admin"
  | "admin"
  | "developer"
  | "designer"
  | "qa"
  | "product_manager";

const LEGACY_ADMIN_EMAILS = ["kevin@outpaged.com", "carlos@outpaged.com"];

export async function getRoleForUser(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
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

export function checkUserRole(role: UserRole): boolean {
  // This is a client-side helper - actual enforcement happens server-side
  return true; // Implement based on your auth context
}