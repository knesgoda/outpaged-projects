import { supabase } from "@/integrations/supabase/client";
import type { OrganizationMember, OrganizationSummary } from "@/types/organization";

export async function fetchOrganizations(): Promise<OrganizationSummary[]> {
  const { data, error } = await (supabase as any)
    .from("organizations")
    .select("id, name, slug, description, settings, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrganizationSummary[]) ?? [];
}

export async function fetchOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  if (!organizationId) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from("organization_members")
    .select("id, organization_id, user_id, role, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrganizationMember[]) ?? [];
}
