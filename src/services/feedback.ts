import { supabase } from "@/integrations/supabase/client";
import type { FeedbackItem } from "@/types";
import { mapSupabaseError } from "./utils";
import { requireUserId } from "./session";

const FEEDBACK_SELECT = "id, user_id, type, page_path, message, screenshot_url, created_at";

export async function submitFeedback(
  input: Pick<FeedbackItem, "type" | "message" | "page_path" | "screenshot_url">
): Promise<FeedbackItem> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("feedback")
    .insert({ ...input, user_id: userId })
    .select(FEEDBACK_SELECT)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to submit feedback.");
  }

  return data;
}
