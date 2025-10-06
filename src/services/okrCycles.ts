import { supabase } from "@/integrations/supabase/client";
import type { OKRCycle } from "@/types";

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to manage OKR cycles.");
  }
  return userId;
}

export async function listCycles(): Promise<OKRCycle[]> {
  const { data, error } = await supabase
    .from("okr_cycles")
    .select("*")
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return (data as OKRCycle[]) ?? [];
}

export async function createCycle(
  input: Omit<OKRCycle, "id" | "owner" | "created_at">
): Promise<OKRCycle> {
  const owner = await requireUserId();
  const payload = {
    owner,
    name: input.name,
    starts_on: input.starts_on,
    ends_on: input.ends_on,
  };

  const { data, error } = await supabase.from("okr_cycles").insert(payload).select("*").single();
  if (error) throw error;
  return data as OKRCycle;
}

export async function deleteCycle(id: string): Promise<void> {
  const owner = await requireUserId();
  const { error } = await supabase.from("okr_cycles").delete().eq("id", id).eq("owner", owner);
  if (error) throw error;
}
