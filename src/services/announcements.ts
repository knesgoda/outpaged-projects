import { supabase } from "@/integrations/supabase/client";
import type { Announcement } from "@/types";
import { mapSupabaseError } from "./utils";

const ANNOUNCEMENT_SELECT =
  "id, title, version, body_markdown, body_html, published_at, created_by";

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements" as any)
    .select(ANNOUNCEMENT_SELECT)
    .order("published_at", { ascending: false });

  if (error) {
    throw mapSupabaseError(error, "Unable to load announcements.");
  }

  return (data as any) ?? [];
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from("announcements" as any)
    .select(ANNOUNCEMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load the announcement.");
  }

  return (data as any) ?? null;
}
