import { supabase } from "@/integrations/supabase/client";
import type { LinkedResource } from "@/types";

const normalizeUrl = (value?: string | null) => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch (error) {
    throw new Error("Invalid URL provided");
  }
};

export async function listLinkedResources(entity: {
  type: LinkedResource["entity_type"];
  id: string;
}): Promise<LinkedResource[]> {
  const { data, error } = await supabase
    .from("linked_resources")
    .select("*")
    .eq("entity_type", entity.type)
    .eq("entity_id", entity.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load linked resources");
  }

  return (data ?? []) as LinkedResource[];
}

export async function addLinkedResource(
  input: Omit<LinkedResource, "id" | "created_at" | "created_by">
): Promise<LinkedResource> {
  const normalizedUrl = normalizeUrl(input.url ?? null);
  const metadata = input.metadata ?? {};

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || "Unable to resolve current user");
  }

  if (!user?.id) {
    throw new Error("You must be signed in to link external resources");
  }

  const payload = {
    ...input,
    url: normalizedUrl,
    metadata,
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("linked_resources")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to save linked resource");
  }

  return data as LinkedResource;
}

export async function removeLinkedResource(id: string): Promise<void> {
  const { error } = await supabase
    .from("linked_resources")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to remove linked resource");
  }
}
